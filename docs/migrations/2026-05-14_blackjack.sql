-- ============================================================
-- ブラックジャック ミニゲーム
-- ============================================================

CREATE TABLE IF NOT EXISTS blackjack_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bet         int  NOT NULL CHECK (bet >= 50),
  deck        jsonb NOT NULL,          -- 残りデッキ [[suit, value], ...]
  player_hand jsonb NOT NULL,          -- プレイヤーの手札
  dealer_hand jsonb NOT NULL,          -- ディーラーの手札（全枚）
  status      text NOT NULL DEFAULT 'playing'
    CHECK (status IN ('playing','player_bust','player_win','dealer_win','push','blackjack','double_bust')),
  net_chips   int  NOT NULL DEFAULT 0, -- 決済済みの純損益（正=勝ち）
  settled     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- chip_transactions type に 'blackjack' を追加
ALTER TABLE chip_transactions
  DROP CONSTRAINT IF EXISTS chip_transactions_type_check;

ALTER TABLE chip_transactions
  ADD CONSTRAINT chip_transactions_type_check
  CHECK (type IN (
    'checkin','transfer','admin','fee',
    'seat_out','withdraw','purchase','coupon',
    'quiz','achievement','blackjack'
  ));
