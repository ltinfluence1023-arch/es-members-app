import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, isMaster } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { NextRequest, NextResponse } from "next/server";

// GET: 全問題一覧
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("quiz_questions")
    .select("id, question, option_a, option_b, option_c, option_d, correct_option, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST: 新規問題作成（マスターのみ）
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isMaster(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const { question, option_a, option_b, option_c, option_d, correct_option } = body;

  if (!question || !option_a || !option_b || !option_c || !option_d ||
      !["a","b","c","d"].includes(correct_option)) {
    return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("quiz_questions")
    .insert({ question, option_a, option_b, option_c, option_d, correct_option, created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "create", category: "quiz",
    summary: `クイズ問題を追加: ${question.slice(0, 40)}`,
    target_type: "quiz_question", target_id: data.id, target_label: question,
    actor_id: user.id, request,
  });

  return NextResponse.json(data, { status: 201 });
}
