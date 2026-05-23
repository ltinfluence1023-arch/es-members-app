import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";

/**
 * LINE プロフィール一括バックフィル
 *
 * auth.users の user_metadata に保存された line_display_name / line_picture_url を
 * public.users の nickname / avatar_url に反映する。
 *
 * 対象: line_user_id は持つが nickname が "LINEユーザー" または avatar_url が null のユーザー
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = createAdminClient();

  // line_user_id を持つ全ユーザーを取得
  const { data: lineUsers } = await adminClient
    .from("users")
    .select("id, nickname, avatar_url, line_user_id")
    .not("line_user_id", "is", null);

  if (!lineUsers?.length) return NextResponse.json({ updated: 0 });

  // auth.users から user_metadata を取得してバックフィル
  const { data: authList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const authMap = new Map(
    (authList?.users ?? []).map(u => [u.id, u.user_metadata])
  );

  let updated = 0;
  for (const u of lineUsers) {
    const meta      = authMap.get(u.id);
    const newName   = meta?.line_display_name  as string | undefined;
    const newPic    = meta?.line_picture_url   as string | undefined;

    const needsUpdate =
      (newName && u.nickname   === "LINEユーザー") ||
      (newPic  && !u.avatar_url);

    if (!needsUpdate) continue;

    await adminClient.from("users").update({
      ...(newName && u.nickname === "LINEユーザー" ? { nickname:   newName } : {}),
      ...(newPic  && !u.avatar_url                 ? { avatar_url: newPic  } : {}),
    }).eq("id", u.id);
    updated++;
  }

  return NextResponse.json({ updated, total: lineUsers.length });
}
