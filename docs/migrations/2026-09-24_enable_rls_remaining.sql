-- ============================================================
-- RLS 未設定テーブルの保護
-- ============================================================
--
-- 背景:
--   2026-05 以降に追加したテーブルは RLS が無効のままで、
--   公開されている anon キーから REST 経由で読み書きできる状態だった。
--   アプリはこれらを service_role (createAdminClient) 経由でのみ操作するため、
--   ポリシーなしで RLS を有効化しても動作に影響はない。
-- ============================================================

alter table fee_transactions    enable row level security;
alter table audit_logs          enable row level security;
alter table achievements        enable row level security;
alter table user_achievements   enable row level security;
alter table achievement_claims  enable row level security;
alter table quiz_questions      enable row level security;
alter table daily_quiz_schedule enable row level security;
alter table quiz_answers        enable row level security;
alter table blackjack_sessions  enable row level security;
