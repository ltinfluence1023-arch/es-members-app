import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import {
  handValue, isBust, dealerPlay, calcNetChips, type Card, type GameResult,
} from "@/lib/utils/blackjack";

type Action = "hit" | "stand" | "double";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { session_id, action } = await request.json().catch(() => ({})) as { session_id?: string; action?: Action };
  if (!session_id || !["hit","stand","double"].includes(action ?? "")) {
    return NextResponse.json({ error: "パラメータ不足" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const { data: session } = await adminClient
    .from("blackjack_sessions")
    .select("*")
    .eq("id", session_id)
    .eq("user_id", user.id)
    .single();

  if (!session) return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
  if (session.status !== "playing") return NextResponse.json({ error: "このゲームはすでに終了しています" }, { status: 409 });

  let playerHand: Card[] = session.player_hand as Card[];
  let dealerHand: Card[] = session.dealer_hand as Card[];
  let deck:       Card[] = session.deck        as Card[];
  const bet = session.bet;

  let result: GameResult | null = null;
  let newStatus = "playing";

  // ── HIT ──
  if (action === "hit") {
    playerHand = [...playerHand, deck.pop()!];
    if (isBust(playerHand)) {
      result    = "player_bust";
      newStatus = "player_bust";
    }
  }

  // ── DOUBLE DOWN ──
  if (action === "double") {
    // チップ残高チェック
    const { data: ud } = await adminClient.from("users").select("chip_balance").eq("id", user.id).single();
    if (!ud || ud.chip_balance < bet) return NextResponse.json({ error: "チップが足りません" }, { status: 400 });
    // 追加ベット
    await adminClient.from("users").update({ chip_balance: ud.chip_balance - bet }).eq("id", user.id);
    await adminClient.from("chip_transactions").insert({
      type: "blackjack" as const, from_user_id: user.id, to_user_id: null,
      amount: bet, memo: "🃏 BJ ダブルダウン追加ベット",
    });

    playerHand = [...playerHand, deck.pop()!];
    if (isBust(playerHand)) {
      result    = "double_bust";
      newStatus = "double_bust";
    } else {
      // ダブル後は強制スタンド → ディーラーターン
      const played = dealerPlay(dealerHand, deck);
      dealerHand   = played.hand;
      deck         = played.deck;
      result       = determineWinner(playerHand, dealerHand);
      newStatus    = resultToStatus(result);
    }
  }

  // ── STAND ──
  if (action === "stand") {
    const played = dealerPlay(dealerHand, deck);
    dealerHand   = played.hand;
    deck         = played.deck;
    result       = determineWinner(playerHand, dealerHand);
    newStatus    = resultToStatus(result);
  }

  const net = result !== null ? calcNetChips(result, bet) : 0;
  const settled = result !== null;

  // セッション更新
  await adminClient.from("blackjack_sessions").update({
    player_hand: JSON.stringify(playerHand),
    dealer_hand: JSON.stringify(dealerHand),
    deck:        JSON.stringify(deck),
    status:      newStatus,
    net_chips:   net,
    settled,
  }).eq("id", session_id);

  // チップ決済
  if (settled && result) {
    const totalBet = action === "double" ? bet * 2 : bet;
    const payout   = calcNetChips(result, totalBet) + totalBet; // 手元に戻る額
    if (payout > 0) {
      await adminClient.from("chip_transactions").insert({
        type: "blackjack" as const, to_user_id: user.id, from_user_id: null,
        amount: payout,
        memo: `🃏 BJ ${statusLabel(newStatus)}`,
      });
    }
  }

  return NextResponse.json({
    playerHand,
    dealerHand:  settled ? dealerHand : [dealerHand[0]],
    playerScore: handValue(playerHand),
    dealerScore: settled ? handValue(dealerHand) : handValue([dealerHand[0]]),
    status:      newStatus,
    net,
    settled,
  });
}

function determineWinner(player: Card[], dealer: Card[]): GameResult {
  const ps = handValue(player);
  const ds = handValue(dealer);
  if (isBust(dealer))   return "player_win";
  if (ps > ds)          return "player_win";
  if (ps < ds)          return "dealer_win";
  return "push";
}

function resultToStatus(r: GameResult): string {
  return r === "player_win" ? "player_win"
       : r === "dealer_win" ? "dealer_win"
       : r === "push"       ? "push"
       : r;
}

function statusLabel(status: string): string {
  const m: Record<string, string> = {
    player_win:  "勝利",
    dealer_win:  "ディーラー勝利",
    push:        "引き分け",
    player_bust: "バスト",
    double_bust: "ダブルバスト",
  };
  return m[status] ?? status;
}
