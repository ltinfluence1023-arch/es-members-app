import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  accessToken: z.string().min(1),
  displayName: z.string().optional(),
  pictureUrl:  z.string().optional(),
});

/**
 * LINE LIFF login → Supabase Auth handoff.
 *
 * Flow:
 *   1. LINE Verify API で accessToken が自チャネル（LINE_CHANNEL_ID）発行のものか確認し、
 *      Profile API で userId / displayName / pictureUrl を取得
 *   2. public.users.line_user_id で既存ユーザーを検索
 *   3a. 新規 → createUser（パスワードはランダム・誰も知らない）→ public.users 作成
 *   3b. createUser 失敗（auth.users だけ既にある）→ generateLink で既存の auth ユーザーを特定 → public.users を修復
 *   4. サーバー側で magiclink のトークンを発行・検証してセッション Cookie を発行し、needsBirthday を返す
 *
 * NOTE: 以前は `line_<userId>_<channelId>` という推測できるパスワードで signInWithPassword していた。
 *       anon key は公開値なので、LINE userId を知っていれば誰でもその会員としてログインできてしまう。
 *       パスワードは使わず、LINE トークンを検証したサーバーだけがセッションを作れる形にした。
 *       既存会員のパスワードは docs/migrations/2026-10-30_line_users_random_password.sql で無効化する。
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

  // 1) accessToken が自チャネルで発行された有効なものか確認（他チャネルのトークンを拒否）
  const verifyRes = await fetch(
    `https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(accessToken)}`,
  );
  const verified = verifyRes.ok
    ? await verifyRes.json() as { client_id?: string; expires_in?: number }
    : null;
  if (!verified || verified.client_id !== channelId || !(Number(verified.expires_in) > 0)) {
    return NextResponse.json({ error: "LINEトークン検証失敗" }, { status: 401 });
  }

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

  const adminClient    = createAdminClient();
  const syntheticEmail = `line_${lineUserId}@line.local`;

  // 2) line_user_id で既存ユーザーを検索
  const { data: existingUser } = await adminClient
    .from("users")
    .select("id, birthday")
    .eq("line_user_id", lineUserId)
    .single();

  let userId        = existingUser?.id ?? null;
  let needsBirthday = !existingUser?.birthday;
  let authEmail     = syntheticEmail;   // セッションを発行する auth ユーザーのメール

  if (!userId) {
    // 3a) 新規 auth ユーザー作成を試みる
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email:         syntheticEmail,
      password:      randomBytes(32).toString("hex"),
      email_confirm: true,
      user_metadata: { line_user_id: lineUserId, line_display_name: displayName, line_picture_url: pictureUrl },
    });

    if (createErr) {
      // --- createUser 失敗（メッセージ問わず） ---
      // 旧コードで auth.users だけ存在し public.users.line_user_id が NULL のケースに対応。
      // generateLink で既存の auth ユーザーを特定する（メールは送られない）。
      const { data: link, error: linkErr } = await adminClient.auth.admin.generateLink({
        type:  "magiclink",
        email: syntheticEmail,
      });

      if (linkErr || !link?.user) {
        return NextResponse.json(
          { error: `ログインできませんでした: ${createErr.message}` },
          { status: 500 },
        );
      }

      userId = link.user.id;

      // public.users を確認・修復
      const { data: pub } = await adminClient
        .from("users")
        .select("id, birthday")
        .eq("id", userId)
        .single();

      if (pub) {
        needsBirthday = !pub.birthday;
        // line_user_id と最新プロフィールを紐付け
        await adminClient.from("users").update({
          line_user_id: lineUserId,
          ...(displayName ? { nickname:   displayName } : {}),
          ...(pictureUrl  ? { avatar_url: pictureUrl  } : {}),
        }).eq("id", userId);
      } else {
        // auth.users はあるが public.users がない → 新規作成
        needsBirthday = true;
        await adminClient.from("users").insert({
          id:             userId,
          nickname:       displayName ?? "LINEユーザー",
          email_or_phone: syntheticEmail,
          avatar_url:     pictureUrl,
          line_user_id:   lineUserId,
        });
      }

    } else if (created.user) {
      // 新規ユーザー作成成功
      userId        = created.user.id;
      needsBirthday = true;

      const { error: insertErr } = await adminClient.from("users").insert({
        id:             userId,
        nickname:       displayName ?? "LINEユーザー",
        email_or_phone: syntheticEmail,
        avatar_url:     pictureUrl,
        line_user_id:   lineUserId,
      });
      if (insertErr) {
        // INSERT 失敗をログに残す（セッション発行は続行し、onboarding で UPSERT して補完）
        console.error("[BJ auth/line] public.users INSERT failed:", insertErr.message);
      }
    } else {
      return NextResponse.json({ error: "ユーザー作成失敗" }, { status: 500 });
    }

  } else {
    // 3c) 既存ユーザー: LINE プロフィールを最新情報に更新
    await adminClient.from("users").update({
      ...(displayName ? { nickname:   displayName } : {}),
      ...(pictureUrl  ? { avatar_url: pictureUrl  } : {}),
    }).eq("id", userId);

    // 後から LINE を紐付けた会員は auth のメールが合成メールと違うので、実際のメールを使う
    const { data: authUser } = await adminClient.auth.admin.getUserById(userId);
    if (!authUser?.user?.email) {
      return NextResponse.json({ error: "ログインできませんでした（アカウント情報なし）" }, { status: 500 });
    }
    authEmail = authUser.user.email;
  }

  // 4) セッション Cookie を発行: magiclink のトークンをサーバー内で発行して即検証する（メールは送られない）
  const { data: link, error: linkErr } = await adminClient.auth.admin.generateLink({
    type:  "magiclink",
    email: authEmail,
  });
  if (linkErr || !link?.properties?.hashed_token) {
    return NextResponse.json({ error: linkErr?.message ?? "ログインできませんでした" }, { status: 500 });
  }

  const supabase = await createClient();
  const { error: otpErr } = await supabase.auth.verifyOtp({
    type:       "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (otpErr) {
    return NextResponse.json({ error: otpErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, userId, needsBirthday });
}
