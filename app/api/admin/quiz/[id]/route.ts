import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMaster } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { NextRequest, NextResponse } from "next/server";

// PATCH: is_active トグル または 問題編集
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isMaster(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("quiz_questions")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "update", category: "quiz",
    summary: `クイズ問題を更新: ${data.question?.slice(0, 40)}`,
    target_type: "quiz_question", target_id: id, target_label: data.question,
    actor_id: user.id, request,
  });

  return NextResponse.json(data);
}

// DELETE: 問題削除
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isMaster(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const adminClient = createAdminClient();

  const { data: q } = await adminClient
    .from("quiz_questions").select("question").eq("id", id).single();

  const { error } = await adminClient
    .from("quiz_questions").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "delete", category: "quiz",
    summary: `クイズ問題を削除: ${q?.question?.slice(0, 40)}`,
    target_type: "quiz_question", target_id: id, target_label: q?.question ?? id,
    actor_id: user.id, request,
  });

  return NextResponse.json({ ok: true });
}
