// カードをコンパクトな配列で表現: [suit, value]
// suit: S=♠ H=♥ D=♦ C=♣
// value: A 2..10 J Q K

export type Suit  = "S" | "H" | "D" | "C";
export type Value = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
export type Card  = [Suit, Value];

export const SUIT_DISPLAY: Record<Suit, string>  = { S: "♠", H: "♥", D: "♦", C: "♣" };
export const RED_SUITS = new Set<Suit>(["H", "D"]);

const SUITS:  Suit[]  = ["S", "H", "D", "C"];
const VALUES: Value[] = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

export function createShuffledDeck(): Card[] {
  const deck: Card[] = SUITS.flatMap((s) => VALUES.map((v): Card => [s, v]));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function cardPoint(card: Card): number {
  const v = card[1];
  if (v === "A") return 11;
  if (["J", "Q", "K"].includes(v)) return 10;
  return parseInt(v, 10);
}

export function handValue(hand: Card[]): number {
  let total = hand.reduce((s, c) => s + cardPoint(c), 0);
  let aces  = hand.filter((c) => c[1] === "A").length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

export const isBust      = (hand: Card[]) => handValue(hand) > 21;
export const isBlackjack = (hand: Card[]) => hand.length === 2 && handValue(hand) === 21;

/** ディーラーがヒットし続けるルール: 17以上でスタンド */
export function dealerPlay(hand: Card[], deck: Card[]): { hand: Card[]; deck: Card[] } {
  const h = [...hand];
  const d = [...deck];
  while (handValue(h) < 17 && d.length > 0) {
    h.push(d.pop()!);
  }
  return { hand: h, deck: d };
}

/** 勝敗判定 → net_chips（純損益。betは含まない。勝ち=+bet, 負け=-bet, 引き分け=0 を呼び出し側で加算） */
export type GameResult =
  | "blackjack"     // BJ (1.5x)
  | "player_win"    // 通常勝ち (1x)
  | "push"          // 引き分け (0)
  | "player_bust"   // バスト (-1x)
  | "double_bust"   // ダブルダウンバスト (-2x)
  | "dealer_win";   // ディーラー勝ち (-1x)

export function calcNetChips(result: GameResult, bet: number): number {
  switch (result) {
    case "blackjack":    return Math.floor(bet * 1.5);
    case "player_win":   return bet;
    case "push":         return 0;
    case "player_bust":  return -bet;
    case "double_bust":  return -bet * 2;
    case "dealer_win":   return -bet;
  }
}
