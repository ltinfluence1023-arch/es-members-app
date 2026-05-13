import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  nickname: z.string().min(1).max(20),
  email: z.string().email(),
  password: z.string().min(8),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "生年月日が不正です"),
  gender: z.enum(["male", "female", "other"]),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
  }

  const { nickname, email, password, birthday, gender } = parsed.data;
  const adminClient = createAdminClient();

  // auth.users にユーザー作成
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nickname },
  });

  if (authError) {
    const msg = authError.message.includes("already registered")
      ? "このメールアドレスはすでに登録されています"
      : authError.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const userId = authData.user.id;

  // public.users に確実に挿入（トリガーが失敗した場合のフォールバック）
  await adminClient
    .from("users")
    .upsert({ id: userId, nickname, email_or_phone: email, birthday, gender }, { onConflict: "id" });

  // セッションを発行してCookieにセット
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return NextResponse.json({ error: "登録しましたがログインに失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
