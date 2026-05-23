import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import {
  createShuffledDeck, handValue, isBlackjack,
  calcNetChips, type Card,
} from "@/lib/utils/blackjack";

const MIN_BET = 50;

export async function POST(request: NextRequest) {
  try {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bet } = await request.json().catch(() => ({}));
  if (!Number.isInteger(bet) || bet < MIN_BET) {
    return NextResponse.json({ error: `最低ベットは${MIN_BET}チップです` }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // チップ残高確認 + ベット分を引く（アトミックにチェック）
  const { data: userData } = await adminClient
    .from("users")
    .select("chip_balance")
    .eq("id", user.id)
    .single();

  if (!userData || userData.chip_balance < bet) {
    return NextResponse.json({ error: "チップが足りません" }, { status: 400 });
  }

  // ベット分をデポジット（chip_balance から直接引く）
  await adminClient
    .from("users")
    .update({ chip_balance: userData.chip_balance - bet })
    .eq("id", user.id);

  // ベット記録（トリガーには引っかからない: blackjack type + from_user のみ）
  await adminClient.from("chip_transactions").insert({
    type:         "blackjack" as const,
    from_user_id: user.id,
    to_user_id:   null,
    amount:       bet,
    memo:         "🃏 BJ ベット",
  });

  // デッキを作成してカードを配る
  const deck = createShuffledDeck();
  const pop  = () => deck.pop()!;

  const playerHand: Card[] = [pop(), pop()];
  const dealerHand: Card[] = [pop(), pop()];

  // 即座にブラックジャック判定
  const playerBJ = isBlackjack(playerHand);
  const dealerBJ = isBlackjack(dealerHand);

  let status: string;
  let net = 0;
  let settled = false;

  if (playerBJ || dealerBJ) {
    if (playerBJ && dealerBJ) { status = "push";       net = 0; }
    else if (playerBJ)        { status = "blackjack";  net = calcNetChips("blackjack", bet); }
    else                      { status = "dealer_win"; net = calcNetChips("dealer_win", bet); }
    settled = true;
  } else {
    status = "playing";
  }

  // セッション作成（JSONB カラムは配列をそのまま渡す）
  const { data: session } = await adminClient
    .from("blackjack_sessions")
    .insert({
      user_id:     user.id,
      bet,
      deck:        deck        as unknown,
      player_hand: playerHand  as unknown,
      dealer_hand: dealerHand  as unknown,
      status,
      net_chips:   net,
      settled,
    })
    .select("id")
    .single();

  // 即時決済（BJ or push の場合）
  let balanceAfter = userData.chip_balance - bet;
  if (settled) {
    balanceAfter = await settle(adminClient, user.id, userData.chip_balance - bet, net, status);
  }

  return NextResponse.json({
    sessionId:   session?.id,
    playerHand,
    dealerHand:  settled ? dealerHand : [dealerHand[0]],
    playerScore: handValue(playerHand),
    dealerScore: settled ? handValue(dealerHand) : handValue([dealerHand[0]]),
    status,
    net,
    settled,
    bet,
    balance: balanceAfter,
  });
  } catch (err) {
    console.error("[BJ start]", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

// settle: chip_balance を direct UPDATE し、ランキング用に chip_transactions を記録する。
// トリガーは blackjack type をスキップするため二重加算しない
//   → migration: docs/migrations/2026-05-14_blackjack_trigger.sql を Supabase で実行すること。
//
// balanceBeforeSettle: ベット分を引いた後の残高
// net: 純損益 (BJ=+1.5×bet, win=+bet, push=0, lose=-bet)
// 戻り値: 決済後の chip_balance
async function settle(
  adminClient: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  userId: string,
  balanceBeforeSettle: number,
  net: number,
  status: string,
): Promise<number> {
  // 払い戻し = ベット元本 + 純損益（負なら 0: 既にベット時に引き済み）
  const payout    = net;                             // 純損益
  const returnAmt = Math.max(0, payout);             // 実際に返ってくる分
  const newBalance = balanceBeforeSettle + returnAmt;

  // chip_balance 直接更新（payout > 0 のときのみ残高が変わる）
  if (returnAmt > 0) {
    await adminClient.from("users")
      .update({ chip_balance: newBalance })
      .eq("id", userId);
  }

  // ランキング・履歴用の chip_transactions 記録
  // payout > 0: to_user_id に記録（+記録）
  // payout <= 0: 負けはベット時の from_user_id 記録のみで十分
  if (returnAmt > 0) {
    try {
      await adminClient.from("chip_transactions").insert({
        type:         "blackjack" as const,
        to_user_id:   userId,
        from_user_id: null,
        amount:       returnAmt,
        memo:         `🃏 BJ ${status === "blackjack" ? "ブラックジャック！" : status === "push" ? "引き分け" : "勝利"}`,
      });
    } catch { /* 記録失敗しても残高には影響しない */ }
  }

  return newBalance;
}
