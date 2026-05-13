import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  idToken: z.string().min(1),       // LIFF id_token (JWT issued by LINE)
  displayName: z.string().optional(),
  pictureUrl: z.string().url().optional(),
});

/**
 * LINE LIFF login → Supabase Auth handoff.
 *
 * Flow:
 *   1. Verify the LIFF id_token with LINE Verify API (server-side, no secret needed).
 *   2. Use line `sub` (LINE user id) as the synthetic email for Supabase Auth.
 *   3. Create user if first time, otherwise just generate a session.
 *   4. Return access_token / refresh_token; the client sets the session.
 */
export async function POST(request: NextRequest) {
  const channelId = process.env.LINE_CHANNEL_ID;
  if (!channelId) {
    return NextResponse.json({ error: "LINE_CHANNEL_ID 未設定" }, { status: 500 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
  }
  const { idToken, displayName, pictureUrl } = parsed.data;

  // 1) Verify id_token with LINE's verify endpoint (no secret required)
  const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
  });
  if (!verifyRes.ok) {
    return NextResponse.json({ error: "LINEトークン検証失敗" }, { status: 401 });
  }
  const verified = await verifyRes.json() as { sub: string; name?: string; picture?: string; email?: string };
  const lineUserId = verified.sub;

  const adminClient = createAdminClient();
  const syntheticEmail = `line_${lineUserId}@line.local`;
  const initialPassword = `line_${lineUserId}_${channelId}`; // deterministic but private

  // 2) Find or create Supabase auth user
  // Try to find existing by email
  const { data: existing } = await adminClient.auth.admin.listUsers();
  let userId: string | null = null;
  for (const u of existing.users ?? []) {
    if (u.email === syntheticEmail) { userId = u.id; break; }
  }

  if (!userId) {
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: syntheticEmail,
      password: initialPassword,
      email_confirm: true,
      user_metadata: { line_user_id: lineUserId, line_display_name: displayName },
    });
    if (createErr || !created.user) {
      return NextResponse.json({ error: createErr?.message ?? "ユーザー作成失敗" }, { status: 500 });
    }
    userId = created.user.id;

    // Create public.users row with LINE display name as nickname
    await adminClient.from("users").upsert({
      id: userId,
      nickname: displayName ?? `line_${lineUserId.slice(0, 8)}`,
      email_or_phone: syntheticEmail,
      avatar_url: pictureUrl ?? null,
    }, { onConflict: "id" });
  }

  // 3) Generate session by signing in with the deterministic password
  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: syntheticEmail,
    password: initialPassword,
  });
  if (signInErr) {
    return NextResponse.json({ error: signInErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, userId });
}
