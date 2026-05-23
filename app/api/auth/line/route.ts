import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  accessToken: z.string().min(1),
  displayName: z.string().optional(),
  pictureUrl:  z.string().optional(),   // URL バリデーション省略（LINE CDN 形式が .url() で弾かれる場合対策）
});

/**
 * LINE LIFF login → Supabase Auth handoff.
 *
 * idToken (openid scope 必須) の代わりに accessToken を使う。
 * profile scope のみで動作し、LINE 側の追加設定が不要。
 *
 * Flow:
 *   1. GET /v2/profile で accessToken を検証し LINE userId を取得
 *   2. public.users.line_user_id で既存ユーザーを検索
 *   3. 未登録なら Supabase auth + public.users 行を作成
 *   4. signInWithPassword でセッション Cookie を発行
 *   5. needsBirthday フラグを返す（初回登録フロー用）
 */
export async function POST(request: NextRequest) {
  const channelId = process.env.LINE_CHANNEL_ID;
  if (!channelId) {
    return NextResponse.json({ error: "LINE_CHANNEL_ID 未設定" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "リクエスト不正" }, { status: 400 });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
  }
  const { accessToken, displayName: clientName, pictureUrl: clientPic } = parsed.data;

  // 1) LINE Profile API で accessToken を検証
  const profileRes = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profileRes.ok) {
    return NextResponse.json({ error: "LINEトークン検証失敗" }, { status: 401 });
  }
  const lineProfile = await profileRes.json() as {
    userId: string;
    displayName: string;
    pictureUrl?: string;
  };

  const lineUserId  = lineProfile.userId;
  const displayName = clientName || lineProfile.displayName;
  const pictureUrl  = clientPic  || lineProfile.pictureUrl || null;

  const adminClient     = createAdminClient();
  const syntheticEmail  = `line_${lineUserId}@line.local`;
  const initialPassword = `line_${lineUserId}_${channelId}`;

  // 2) line_user_id カラムで既存ユーザーを検索
  const { data: existingUser } = await adminClient
    .from("users")
    .select("id, birthday")
    .eq("line_user_id", lineUserId)
    .single();

  let userId       = existingUser?.id ?? null;
  let needsBirthday = !existingUser?.birthday;

  if (!userId) {
    // 3a) 新規 Supabase auth ユーザー作成
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email:          syntheticEmail,
      password:       initialPassword,
      email_confirm:  true,
      user_metadata:  { line_user_id: lineUserId, line_display_name: displayName },
    });
    if (createErr || !created.user) {
      return NextResponse.json(
        { error: createErr?.message ?? "ユーザー作成失敗" },
        { status: 500 },
      );
    }
    userId        = created.user.id;
    needsBirthday = true;

    // 3b) public.users 行を作成（birthday は後でオンボーディングで設定）
    await adminClient.from("users").insert({
      id:           userId,
      nickname:     displayName ?? "LINEユーザー",
      email_or_phone: syntheticEmail,
      avatar_url:   pictureUrl,
      line_user_id: lineUserId,
    });
  } else {
    // 3c) 既存ユーザー: LINE プロフィールを最新情報に更新
    await adminClient.from("users").update({
      ...(displayName ? { nickname:   displayName } : {}),
      ...(pictureUrl  ? { avatar_url: pictureUrl  } : {}),
    }).eq("id", userId);
  }

  // 4) signInWithPassword でセッション Cookie を発行
  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email:    syntheticEmail,
    password: initialPassword,
  });
  if (signInErr) {
    return NextResponse.json({ error: signInErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, userId, needsBirthday });
}
