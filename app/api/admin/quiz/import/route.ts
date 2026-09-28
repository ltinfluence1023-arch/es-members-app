import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isMaster } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { QUIZ_CSV_MAX_ROWS } from "@/lib/utils/quizCsv";

const text = z.string().trim().min(1).max(500);
const schema = z.object({
  rows: z.array(z.object({
    question: text,
    option_a: text,
    option_b: text,
    option_c: text,
    option_d: text,
    correct_option: z.enum(["a", "b", "c", "d"]),
  })).min(1).max(QUIZ_CSV_MAX_ROWS),
});

// CSVで読み込んだ問題を一括登録（マスターのみ）。同じ問題文は登録済み・CSV内とも重複として読み飛ばす
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isMaster(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: `登録できない行があります（最大${QUIZ_CSV_MAX_ROWS}問、各項目500文字以内）` }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: existing } = await adminClient.from("quiz_questions").select("question");
  const seen = new Set((existing ?? []).map((q) => q.question.trim()));

  const toInsert = [];
  let skipped = 0;
  for (const r of parsed.data.rows) {
    if (seen.has(r.question)) { skipped++; continue; }
    seen.add(r.question);
    toInsert.push({ ...r, is_active: true, created_by: user.id });
  }

  if (toInsert.length > 0) {
    const { error } = await adminClient.from("quiz_questions").insert(toInsert);
    if (error) return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }

  await recordAudit({
    action: "quiz_import",
    category: "quiz",
    summary: `クイズをCSVで一括登録: ${toInsert.length}問（重複スキップ ${skipped}問）`,
    details: { inserted: toInsert.length, skipped },
    actor_id: user.id,
    request,
  });

  return NextResponse.json({ inserted: toInsert.length, skipped });
}
