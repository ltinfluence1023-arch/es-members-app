import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { getBusinessDayStartUTC } from "@/lib/utils/businessDay";

const QUIZ_CHIP_REWARD = 10;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { question_id, selected_option } = body as { question_id?: string; selected_option?: string };

  if (!question_id || !["a", "b", "c", "d"].includes(selected_option ?? "")) {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const businessDayTs = getBusinessDayStartUTC().getTime();

  // 二重回答チェック
  const { data: existing } = await adminClient
    .from("quiz_answers")
    .select("id")
    .eq("user_id", user.id)
    .eq("business_day_ts", businessDayTs)
    .single();

  if (existing) {
    return NextResponse.json({ error: "本日はすでに回答済みです" }, { status: 409 });
  }

  // 今日の出題問題と一致するか確認
  const { data: schedule } = await adminClient
    .from("daily_quiz_schedule")
    .select("question_id")
    .eq("business_day_ts", businessDayTs)
    .single();

  if (!schedule || schedule.question_id !== question_id) {
    return NextResponse.json({ error: "問題が一致しません" }, { status: 400 });
  }

  // 正解判定
  const { data: q } = await adminClient
    .from("quiz_questions")
    .select("correct_option")
    .eq("id", question_id)
    .single();

  if (!q) return NextResponse.json({ error: "問題が見つかりません" }, { status: 404 });

  const isCorrect = selected_option === q.correct_option;

  // 回答を記録
  await adminClient.from("quiz_answers").insert({
    user_id:         user.id,
    question_id:     question_id as string,
    business_day_ts: businessDayTs,
    selected_option: selected_option as string,
    is_correct:      isCorrect,
    chip_awarded:    isCorrect,
  });

  // 正解ならチップ付与
  if (isCorrect) {
    await adminClient.from("chip_transactions").insert({
      type:        "quiz",
      amount:      QUIZ_CHIP_REWARD,
      to_user_id:  user.id,
      from_user_id: null,
      memo:        "デイリークイズ正解ボーナス",
    });
  }

  return NextResponse.json({
    correct:       isCorrect,
    correctOption: q.correct_option,
    chipAwarded:   isCorrect ? QUIZ_CHIP_REWARD : 0,
  });
}
