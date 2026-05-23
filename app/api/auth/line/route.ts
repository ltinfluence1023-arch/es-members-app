import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  idToken: z.string().min(1),
  displayName: z.string().optional(),
  pictureUrl: z.string().url().optional(),
});

/**
 * LINE LIFF login → Supabase Auth handoff.
 *
 * Flow:
 *   1. LINE Verify API で id_token を検証して LINE userId (sub) を取得
 *   2. public.users.line_user_id で既存ユーザーを検索（listUsers() より高速）
 *   3. 未登録なら Supabase auth + public.users 行を作成
 *   4. 決定論的パスワードで signInWithPassword → セッション Cookie を発行
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

  // 1) LINE の Verify API で id_token を検証（secret 不要）
  const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
  });
  if (!verifyRes.ok) {
    return NextResponse.json({ error: "LINEトークン検証失敗" }, { status: 401 });
  }
  const verified = await verifyRes.json() as {
    sub: string;
    name?: string;
    picture?: string;
    email?: string;
  };
  const lineUserId = verified.sub;

  const adminClient = createAdminClient();
  const syntheticEmail  = `line_${lineUserId}@line.local`;
  const initialPassword = `line_${lineUserId}_${channelId}`;

  // 2) line_user_id カラムで既存ユーザーを検索
  const { data: existingUser } = await adminClient
    .from("users")
    .select("id")
    .eq("line_user_id", lineUserId)
    .single();

  let userId = existingUser?.id ?? null;

  if (!userId) {
    // 3a) 新規 Supabase auth ユーザーを作成
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: syntheticEmail,
      password: initialPassword,
      email_confirm: true,
      user_metadata: { line_user_id: lineUserId, line_display_name: displayName },
    });
    if (createErr || !created.user) {
      return NextResponse.json(
        { error: createErr?.message ?? "ユーザー作成失敗" },
        { status: 500 },
      );
    }
    userId = created.user.id;

    // 3b) public.users 行を作成
    await adminClient.from("users").insert({
      id: userId,
      nickname: displayName ?? "LINEユーザー",
      email_or_phone: syntheticEmail,
      avatar_url: pictureUrl ?? null,
      line_user_id: lineUserId,
    });
  } else {
    // 3c) 既存ユーザー: プロフィールを最新 LINE 情報で更新
    await adminClient.from("users").update({
      ...(displayName ? { nickname: displayName } : {}),
      ...(pictureUrl  ? { avatar_url: pictureUrl } : {}),
    }).eq("id", userId);
  }

  // 4) 決定論的パスワードで signInWithPassword → Cookie にセッションを書き込む
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
