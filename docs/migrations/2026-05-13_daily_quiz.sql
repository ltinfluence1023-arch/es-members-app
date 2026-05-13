-- ============================================================
-- デイリークイズ機能
-- ============================================================

-- 1. quiz_questions: 問題バンク（管理者が登録）
CREATE TABLE IF NOT EXISTS quiz_questions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question       text NOT NULL,
  option_a       text NOT NULL,
  option_b       text NOT NULL,
  option_c       text NOT NULL,
  option_d       text NOT NULL,
  correct_option text NOT NULL CHECK (correct_option IN ('a','b','c','d')),
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid REFERENCES admin_users(id) ON DELETE SET NULL
);

-- 2. daily_quiz_schedule: 営業日ごとに出題する問題（初回アクセス時に自動選択）
CREATE TABLE IF NOT EXISTS daily_quiz_schedule (
  business_day_ts bigint PRIMARY KEY,   -- 営業日開始 UTC ミリ秒
  question_id     uuid NOT NULL REFERENCES quiz_questions(id)
);

-- 3. quiz_answers: ユーザーの回答記録（1営業日1回）
CREATE TABLE IF NOT EXISTS quiz_answers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id     uuid NOT NULL REFERENCES quiz_questions(id),
  business_day_ts bigint NOT NULL,
  selected_option text NOT NULL CHECK (selected_option IN ('a','b','c','d')),
  is_correct      boolean NOT NULL,
  chip_awarded    boolean NOT NULL DEFAULT false,
  answered_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, business_day_ts)  -- 1日1回制限
);

-- 4. chip_transactions の type 制約に 'quiz' を追加
ALTER TABLE chip_transactions
  DROP CONSTRAINT IF EXISTS chip_transactions_type_check;

ALTER TABLE chip_transactions
  ADD CONSTRAINT chip_transactions_type_check
  CHECK (type IN (
    'checkin','transfer','admin','fee',
    'seat_out','withdraw','purchase','coupon',
    'quiz'
  ));
