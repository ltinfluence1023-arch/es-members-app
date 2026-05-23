-- ============================================================
-- LINE連携: users テーブルに line_user_id カラム追加
-- ============================================================
--
-- 背景:
--   LIFF (LINE Front-end Framework) によるLINEログインを実装するにあたり、
--   LINE の userId (sub) を users テーブルで管理する必要がある。
--   これにより listUsers() による全件スキャンを廃止し、
--   効率的な単一ルックアップが可能になる。
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS line_user_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_line_user_id
  ON users (line_user_id)
  WHERE line_user_id IS NOT NULL;
