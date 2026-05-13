import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import {
  createShuffledDeck, handValue, isBlackjack,
  dealerPlay, calcNetChips, type Card,
} from "@/lib/utils/blackjack";

const MIN_BET = 50;

export async function POST(request: NextRequest) {
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

  // セッション作成
  const { data: session } = await adminClient
    .from("blackjack_sessions")
    .insert({
      user_id:     user.id,
      bet,
      deck:        JSON.stringify(deck),
      player_hand: JSON.stringify(playerHand),
      dealer_hand: JSON.stringify(dealerHand),
      status,
      net_chips:   net,
      settled,
    })
    .select("id")
    .single();

  // 即時決済（BJ or push の場合）
  if (settled) {
    await settle(adminClient, user.id, bet, net, status);
  }

  return NextResponse.json({
    sessionId:  session?.id,
    playerHand,
    dealerHand: [dealerHand[0]],   // 1枚目のみ公開
    playerScore: handValue(playerHand),
    dealerScore: handValue([dealerHand[0]]),
    status,
    net,
    balance: userData.chip_balance - bet + (settled ? Math.max(0, net) + (net >= 0 ? bet : 0) : 0),
  });
}

async function settle(
  adminClient: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  userId: string,
  bet: number,
  net: number,
  status: string,
) {
  const payout = net + bet; // 0以上なら返金
  if (payout > 0) {
    // トリガーで chip_balance += payout
    await adminClient.from("chip_transactions").insert({
      type:         "blackjack" as const,
      to_user_id:   userId,
      from_user_id: null,
      amount:       payout,
      memo:         `🃏 BJ ${status === "blackjack" ? "ブラックジャック！" : status === "push" ? "引き分け" : "勝利"}`,
    });
  }
}
