import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { sendPush, chipNoticeText, rankingUpText } from "@/lib/line/messaging";

const schema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().refine((n) => n !== 0),
  memo: z.string().optional(),
});

const DEFAULT_CHIP_MEMO = "管理者操作";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "入力が不正です" }, { status: 400 });

  const { userId, amount, memo } = parsed.data;
  const adminClient = createAdminClient();

  // チップ変更前のランキング情報を取得
  const { data: userBefore } = await adminClient
    .from("users")
    .select("nickname, chip_balance, line_user_id")
    .eq("id", userId)
    .single();

  const oldBalance = userBefore?.chip_balance ?? 0;

  // chip_balance > oldBalance のユーザー数 + 1 = 変更前の順位
  const { count: higherBefore } = await adminClient
    .from("users")
    .select("*", { count: "exact", head: true })
    .gt("chip_balance", oldBalance);
  const rankBefore = (higherBefore ?? 0) + 1;

  const { error } = await adminClient.from("chip_transactions").insert({
    to_user_id:   amount > 0 ? userId : null,
    from_user_id: amount < 0 ? userId : null,
    amount:       Math.abs(amount),
    type:         "admin",
    memo:         memo || DEFAULT_CHIP_MEMO,
    created_by:   user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: amount > 0 ? "chip_grant" : "chip_reduce",
    category: "chip",
    summary: `チップ ${amount > 0 ? "+" : ""}${amount.toLocaleString()} chip → ${userBefore?.nickname ?? "—"}（${memo || DEFAULT_CHIP_MEMO}）`,
    target_type: "user", target_id: userId, target_label: userBefore?.nickname ?? null,
    details: { amount, memo },
    actor_id: user.id, request,
  });

  // LINE 通知（line_user_id があれば送信・失敗してもレスポンスには影響しない）
  const lineUserId = userBefore?.line_user_id;
  if (lineUserId) {
    // 変更後の残高を取得
    const { data: userAfter } = await adminClient
      .from("users")
      .select("chip_balance")
      .eq("id", userId)
      .single();
    const newBalance = userAfter?.chip_balance ?? (oldBalance + amount);

    // チップ通知を送信
    sendPush(lineUserId, chipNoticeText(amount, newBalance, memo || DEFAULT_CHIP_MEMO));

    // ランキング上昇チェック（チップ付与時のみ）
    if (amount > 0) {
      const { count: higherAfter } = await adminClient
        .from("users")
        .select("*", { count: "exact", head: true })
        .gt("chip_balance", newBalance);
      const rankAfter = (higherAfter ?? 0) + 1;

      if (rankAfter < rankBefore) {
        sendPush(lineUserId, rankingUpText(rankBefore, rankAfter));
      }
    }
  }

  return NextResponse.json({ success: true });
}
