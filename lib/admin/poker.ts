import { createAdminClient } from "@/lib/supabase/admin";

export const POKER_ERROR_MESSAGES: Record<string, string> = {
  INVALID_AMOUNT: "チップ数が不正です",
  TABLE_NOT_FOUND: "テーブルが見つかりません",
  INVALID_SEAT: "席番号が不正です",
  USER_NOT_FOUND: "顧客が見つかりません",
  ALREADY_SEATED: "この顧客はすでに別の席に着席しています",
  SEAT_TAKEN: "この席はすでに埋まっています",
  INSUFFICIENT_BALANCE: "チップ残高が足りません",
  SESSION_NOT_FOUND: "着席情報が見つかりません（すでに退席済みの可能性があります）",
};

/** poker_* 関数の raise exception を画面表示用メッセージに変換 */
export function pokerErrorMessage(message: string): string {
  const code = Object.keys(POKER_ERROR_MESSAGES).find((k) => message.includes(k));
  if (code) return POKER_ERROR_MESSAGES[code];
  // 一意制約（同時操作）: uq_poker_sessions_seat / uq_poker_sessions_user
  if (message.includes("uq_poker_sessions_seat")) return POKER_ERROR_MESSAGES.SEAT_TAKEN;
  if (message.includes("uq_poker_sessions_user")) return POKER_ERROR_MESSAGES.ALREADY_SEATED;
  return "処理に失敗しました";
}

export function seatLabel(seatNo: number): string {
  return `P${seatNo}`;
}

export type PokerSeatUser = {
  id: string;
  nickname: string;
  avatar_url: string | null;
  chip_balance: number;
};

export type PokerSeatState = {
  sessionId: string;
  seatNo: number;
  withdrawTotal: number;
  purchaseTotal: number;
  seatedAt: string;
  user: PokerSeatUser;
};

export type PokerTableState = {
  id: string;
  name: string;
  seatCount: number;
  isActive: boolean;
  seats: PokerSeatState[];
};

/** 卓一覧と着席中セッションをまとめて取得（管理画面の初期表示・ポーリング共通） */
export async function getPokerState(): Promise<PokerTableState[]> {
  const adminClient = createAdminClient();

  const [{ data: tables }, { data: sessions }] = await Promise.all([
    adminClient
      .from("poker_tables")
      .select("id, name, seat_count, is_active, sort_order")
      .order("sort_order")
      .order("created_at"),
    adminClient
      .from("poker_sessions")
      .select("id, table_id, seat_no, user_id, withdraw_total, purchase_total, seated_at")
      .eq("status", "seated"),
  ]);

  const userIds = [...new Set((sessions ?? []).map((s) => s.user_id))];
  const { data: users } = userIds.length
    ? await adminClient.from("users").select("id, nickname, avatar_url, chip_balance").in("id", userIds)
    : { data: [] as PokerSeatUser[] };
  const userMap = new Map((users ?? []).map((u) => [u.id, u]));

  return (tables ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    seatCount: t.seat_count,
    isActive: t.is_active,
    seats: (sessions ?? [])
      .filter((s) => s.table_id === t.id)
      .map((s) => ({
        sessionId: s.id,
        seatNo: s.seat_no,
        withdrawTotal: s.withdraw_total,
        purchaseTotal: s.purchase_total,
        seatedAt: s.seated_at,
        user: userMap.get(s.user_id) ?? { id: s.user_id, nickname: "—", avatar_url: null, chip_balance: 0 },
      })),
  }));
}
