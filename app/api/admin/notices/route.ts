import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { multicast, noticeText } from "@/lib/line/messaging";
import { FEATURES } from "@/lib/features";

const schema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  is_published: z.boolean().default(true),
});

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await createAdminClient()
    .from("admin_users").select("id").eq("id", userId).single();
  return !!data;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "入力が不正です" }, { status: 400 });

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("notices").insert(parsed.data);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 公開通知: is_published = true かつ FEATURES.lineNoticePush が有効なときだけ LINE 通知を送る
  // （一斉通知は通数＝費用のため、既定ではオフ。lib/features.ts を参照）
  if (parsed.data.is_published && FEATURES.lineNoticePush) {
    // line_user_id を持つ全ユーザーを取得してマルチキャスト
    const { data: lineUsers } = await adminClient
      .from("users")
      .select("line_user_id")
      .not("line_user_id", "is", null);

    const ids = (lineUsers ?? [])
      .map((u) => u.line_user_id)
      .filter((id): id is string => !!id);

    multicast(ids, noticeText(parsed.data.title));
  }

  return NextResponse.json({ success: true });
}
