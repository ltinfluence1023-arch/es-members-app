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
 *   1. LINE Profile API で accessToken を検証し userId / displayName / pictureUrl を取得
 *   2. public.users.line_user_id で既存ユーザーを検索
 *   3a. 新規 → createUser → public.users 作成
 *   3b. createUser 失敗 → signInWithPassword で既存セッションを確立 → public.users を修復
 *   4. セッション Cookie を発行して needsBirthday を返す
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

  // 2) line_user_id で既存ユーザーを検索
  const { data: existingUser } = await adminClient
    .from("users")
    .select("id, birthday")
    .eq("line_user_id", lineUserId)
    .single();

  let userId        = existingUser?.id ?? null;
  let needsBirthday = !existingUser?.birthday;
  let sessionReady  = false;   // signInWithPassword を既に実行済みかどうか

  if (!userId) {
    // 3a) 新規 auth ユーザー作成を試みる
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email:         syntheticEmail,
      password:      initialPassword,
      email_confirm: true,
      user_metadata: { line_user_id: lineUserId, line_display_name: displayName },
    });

    if (createErr) {
      // --- createUser 失敗（メッセージ問わず） ---
      // 旧コードで auth.users だけ存在し public.users.line_user_id が NULL のケースに対応。
      // signInWithPassword で既存セッションを確立し userId を取得する。
      const supabase = await createClient();
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email:    syntheticEmail,
        password: initialPassword,
      });

      if (signInErr || !signInData?.user) {
        // 本当にログインできない（パスワード不一致など）
        return NextResponse.json(
          { error: `ログインできませんでした: ${createErr.message}` },
          { status: 500 },
        );
      }

      userId       = signInData.user.id;
      sessionReady = true;

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
  }

  // 4) セッション Cookie を発行（3b で signIn 済みの場合はスキップ）
  if (!sessionReady) {
    const supabase = await createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email:    syntheticEmail,
      password: initialPassword,
    });
    if (signInErr) {
      return NextResponse.json({ error: signInErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, userId, needsBirthday });
}
