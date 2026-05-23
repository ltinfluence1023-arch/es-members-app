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
 * LINE プロフィール同期（認証済みユーザー専用）
 *
 * LIFF を開くたびにバックグラウンドで呼び出し、
 * nickname / avatar_url / line_user_id を最新の LINE 情報に更新する。
 * アカウント作成やセッション発行は行わない。
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const { accessToken, displayName: clientName, pictureUrl: clientPic } = parsed.data;

  // LINE Profile API でアクセストークンを検証
  const profileRes = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profileRes.ok) return NextResponse.json({ ok: false }, { status: 401 });

  const lineProfile = await profileRes.json() as {
    userId: string;
    displayName: string;
    pictureUrl?: string;
  };

  const lineUserId  = lineProfile.userId;
  const displayName = clientName || lineProfile.displayName;
  const pictureUrl  = clientPic  || lineProfile.pictureUrl || null;

  // nickname / avatar_url / line_user_id を更新
  await createAdminClient()
    .from("users")
    .update({
      line_user_id: lineUserId,
      ...(displayName ? { nickname:   displayName } : {}),
      ...(pictureUrl  ? { avatar_url: pictureUrl  } : {}),
    })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
