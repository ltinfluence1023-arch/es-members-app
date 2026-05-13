import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getBusinessDayStartUTC } from "@/lib/utils/businessDay";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminClient = createAdminClient();
  const businessDayTs = getBusinessDayStartUTC().getTime();

  // 今日の出題問題を確認 → なければランダム選択して登録
  let { data: schedule } = await adminClient
    .from("daily_quiz_schedule")
    .select("question_id")
    .eq("business_day_ts", businessDayTs)
    .single();

  if (!schedule) {
    const { data: questions } = await adminClient
      .from("quiz_questions")
      .select("id")
      .eq("is_active", true);

    if (!questions?.length) {
      return NextResponse.json({ question: null, answered: false, result: null });
    }

    const picked = questions[Math.floor(Math.random() * questions.length)];
    await adminClient
      .from("daily_quiz_schedule")
      .upsert({ business_day_ts: businessDayTs, question_id: picked.id }, { onConflict: "business_day_ts" });

    schedule = { question_id: picked.id };
  }

  // 問題取得（正解は返さない）
  const { data: q } = await adminClient
    .from("quiz_questions")
    .select("id, question, option_a, option_b, option_c, option_d")
    .eq("id", schedule.question_id)
    .single();

  // 本日の回答済み確認
  const { data: answer } = await adminClient
    .from("quiz_answers")
    .select("selected_option, is_correct")
    .eq("user_id", user.id)
    .eq("business_day_ts", businessDayTs)
    .single();

  // 回答済みなら正解を開示
  let correctOption: string | null = null;
  if (answer) {
    const { data: full } = await adminClient
      .from("quiz_questions")
      .select("correct_option")
      .eq("id", schedule.question_id)
      .single();
    correctOption = full?.correct_option ?? null;
  }

  return NextResponse.json({
    question: q ?? null,
    answered: !!answer,
    result: answer
      ? { correct: answer.is_correct, selected: answer.selected_option, correctOption }
      : null,
  });
}
