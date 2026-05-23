import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "生年月日の形式が正しくありません"),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
  }

  const { birthday } = parsed.data;

  // 20歳未満は登録不可（バーのため）
  const birthDate = new Date(birthday);
  const today     = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
  if (age < 20) {
    return NextResponse.json({ error: "20歳未満の方はご利用いただけません" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // UPSERT を使用する理由:
  //   api/auth/line の public.users INSERT が何らかの原因で失敗した場合、
  //   UPDATE では 0 件更新でエラーなし（誕生日が保存されない無限ループに陥る）。
  //   UPSERT なら行が存在しない場合でも INSERT して補完できる。
  //
  //   auth.users の user_metadata に LINE 情報を保存しているため、
  //   ここで public.users を再作成できる。
  const lineUserId   = user.user_metadata?.line_user_id    as string | undefined;
  const nickname     = user.user_metadata?.line_display_name as string | undefined;
  const pictureUrl   = user.user_metadata?.line_picture_url  as string | undefined;

  const { error } = await adminClient
    .from("users")
    .upsert({
      id:             user.id,
      birthday,
      // INSERT の場合に必要な必須フィールド（UPDATE 時は id 一致行だけが更新される）
      nickname:       nickname     ?? "LINEユーザー",
      email_or_phone: user.email   ?? `line_${user.id.slice(0, 8)}@line.local`,
      line_user_id:   lineUserId   ?? null,
      avatar_url:     pictureUrl   ?? null,
    }, { onConflict: "id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
