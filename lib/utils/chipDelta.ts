/**
 * Chip transaction → signed delta for a specific user.
 *
 * Single source of truth for "what did this transaction do to the user's chip balance".
 * Used everywhere balance / ranking is computed so user-side and admin-side always agree.
 *
 * Convention:
 *   to_user_id   = chips received by that user        → +amount
 *   from_user_id = chips moved out of that user       → -amount
 *   EXCEPT type='seat_out': from_user_id holds the user *receiving* chips
 *     back from the poker table (poker-system convention) → +amount
 */
export type ChipTxRow = {
  type: string;
  amount: number;
  from_user_id: string | null;
  to_user_id: string | null;
};

export function chipDeltaForUser(tx: ChipTxRow, userId: string): number {
  if (tx.to_user_id === userId) return tx.amount;
  if (tx.from_user_id === userId) {
    // Poker "seat out" returns chips back to the player → positive for that user
    if (tx.type === "seat_out") return tx.amount;
    return -tx.amount;
  }
  return 0;
}

/**
 * Sum signed deltas across all transactions for every user that touched any of them.
 * Returns: { userId → netDelta }
 */
export function netChangeByUser(txs: ChipTxRow[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const tx of txs) {
    if (tx.to_user_id) {
      totals[tx.to_user_id] = (totals[tx.to_user_id] ?? 0) + tx.amount;
    }
    if (tx.from_user_id) {
      const delta = tx.type === "seat_out" ? +tx.amount : -tx.amount;
      totals[tx.from_user_id] = (totals[tx.from_user_id] ?? 0) + delta;
    }
  }
  return totals;
}
