import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkAutoAchievements } from "@/lib/utils/autoAchievements";

const transferSchema = z.object({
  token: z.string().uuid(),
  amount: z.number().int().positive(), // R-302
});

// R-301〜R-306: チップ送金ルール
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = transferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
  }

  const { token, amount } = parsed.data;
  const adminClient = createAdminClient();

  // R-305: QRトークン検証
  const { data: qrToken } = await adminClient
    .from("qr_tokens")
    .select("user_id, expires_at, used_at")
    .eq("token", token)
    .eq("purpose", "user_receive")
    .single();

  if (!qrToken) {
    return NextResponse.json({ error: "QRコードが無効です" }, { status: 400 });
  }
  if (qrToken.used_at) {
    return NextResponse.json({ error: "このQRコードは使用済みです" }, { status: 400 });
  }
  if (new Date(qrToken.expires_at) < new Date()) {
    return NextResponse.json({ error: "QRコードの有効期限が切れています" }, { status: 400 });
  }

  const toUserId = qrToken.user_id;

  // R-301: 自己送金禁止
  if (user.id === toUserId) {
    return NextResponse.json({ error: "自分自身へは送金できません" }, { status: 400 });
  }

  // R-002, R-004: SELECT FOR UPDATE で残高ロック（RPC経由）
  const { data: senderData } = await adminClient
    .from("users")
    .select("chip_balance, nickname")
    .eq("id", user.id)
    .single();

  if (!senderData || senderData.chip_balance < amount) {
    return NextResponse.json({ error: "チップ残高が不足しています" }, { status: 400 }); // R-002
  }

  const { data: receiverData } = await adminClient
    .from("users")
    .select("nickname")
    .eq("id", toUserId)
    .single();

  // 手数料計算: 10% (切り下げ)
  const fee = Math.floor(amount * 0.1);
  const netAmount = amount - fee;

  // 1) Net amount transfer A→B
  const { data: txData, error: txError } = await adminClient
    .from("chip_transactions")
    .insert({
      from_user_id: user.id,
      to_user_id: toUserId,
      amount: netAmount,
      type: "transfer",
    })
    .select("id")
    .single();

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 });
  }

  // 2) Fee deduction A→pool (only if fee > 0)
  if (fee > 0) {
    const { data: feeChipTx, error: feeChipErr } = await adminClient
      .from("chip_transactions")
      .insert({
        from_user_id: user.id,
        to_user_id: null,
        amount: fee,
        type: "fee",
        memo: `送付手数料 10%`,
      })
      .select("id")
      .single();

    if (feeChipErr) {
      return NextResponse.json({ error: feeChipErr.message }, { status: 500 });
    }

    // 3) Record in fee_transactions ledger
    await adminClient.from("fee_transactions").insert({
      amount: fee,
      source: "transfer_fee",
      memo: `${senderData.nickname} → ${receiverData?.nickname ?? "相手"} の送付手数料`,
      related_user_id: user.id,
      related_chip_tx_id: feeChipTx?.id ?? null,
    });
  }

  // R-803: トークンを使用済みに
  await adminClient
    .from("qr_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);

  await checkAutoAchievements(user.id, "transfer");

  return NextResponse.json({
    success: true,
    amount,
    netAmount,
    fee,
    toNickname: receiverData?.nickname ?? "相手",
    txId: txData?.id ?? null,
  });
}
