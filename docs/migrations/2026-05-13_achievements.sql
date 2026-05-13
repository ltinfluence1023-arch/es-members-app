-- ============================================================
-- アチーブメント制度
-- ============================================================

-- 1. アチーブメント定義
CREATE TABLE IF NOT EXISTS achievements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,
  name        text NOT NULL,
  description text NOT NULL,
  category    text NOT NULL CHECK (category IN ('visit','social','game','sns','community')),
  difficulty  int  NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  points      int  NOT NULL DEFAULT 1,    -- マスターが管理画面から変更可能
  chip_reward int  NOT NULL DEFAULT 0,    -- 達成時付与チップ（同じくマスターが変更可能）
  track_type  text NOT NULL CHECK (track_type IN ('auto','staff_grant','user_claim')),
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. ユーザー達成記録（1人1回）
CREATE TABLE IF NOT EXISTS user_achievements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES achievements(id),
  granted_by     uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  note           text,
  achieved_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

-- 3. 申請レコード（本人申請型のレビュー用）
CREATE TABLE IF NOT EXISTS achievement_claims (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES achievements(id),
  proof_url      text,
  message        text,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by    uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  review_note    text,
  claimed_at     timestamptz NOT NULL DEFAULT now(),
  reviewed_at    timestamptz,
  UNIQUE (user_id, achievement_id)  -- 申請も1回のみ
);

-- 4. chip_transactions type に 'achievement' を追加
ALTER TABLE chip_transactions
  DROP CONSTRAINT IF EXISTS chip_transactions_type_check;

ALTER TABLE chip_transactions
  ADD CONSTRAINT chip_transactions_type_check
  CHECK (type IN (
    'checkin','transfer','admin','fee',
    'seat_out','withdraw','purchase','coupon',
    'quiz','achievement'
  ));

-- ============================================================
-- 初期ミッション 18件 (ON CONFLICT DO NOTHING でべき等)
-- ============================================================
INSERT INTO achievements (code, name, description, category, difficulty, points, chip_reward, track_type, sort_order) VALUES
-- 来店 (5件)
('first_checkin',    '初回チェックイン',     'アプリ登録後、初めて来店チェックインする',           'visit',     1, 1, 200,  'auto',        10),
('weekday_visit',    '平日開拓',             '月〜木のいずれかに来店する',                       'visit',     2, 2, 400,  'auto',        20),
('monthly_3visits',  '月3回来店',            '同じ月に3回来店する',                              'visit',     3, 3, 700,  'auto',        30),
('two_week_streak',  '連続来店',             '2週連続で来店する',                                'visit',     3, 3, 700,  'auto',        40),
('birthday_visit',   '誕生月来店',           '誕生月に来店する',                                 'visit',     1, 1, 200,  'auto',        50),
-- 交流 (4件)
('set_nickname',     'ニックネーム登録',     'アプリのニックネームを設定する',                   'social',    1, 1, 200,  'auto',        60),
('first_talk',       'はじめましてトーク',   '初対面のお客様と会話する',                         'social',    2, 2, 400,  'staff_grant', 70),
('chip_transfer',    'チップトランスファー', '他のお客様にチップを送る',                         'social',    2, 2, 400,  'auto',        80),
('friend_referral',  '友達紹介',             '新規のお客様を1人連れてくる',                      'social',    4, 5, 1200, 'staff_grant', 90),
-- ゲーム (4件)
('first_game',       '初ゲーム参加',         '店内ゲームに初めて参加する',                       'game',      1, 1, 200,  'staff_grant', 100),
('uno_play',         'UNO参加',              'UNOに参加する',                                    'game',      1, 1, 200,  'staff_grant', 110),
('poker_experience', 'ポーカー体験',         'テキサスホールデムを1回体験する',                  'game',      2, 2, 400,  'staff_grant', 120),
('three_games',      '3ゲーム制覇',          '1日で3種類以上のゲームに参加する',                 'game',      3, 3, 700,  'staff_grant', 130),
-- SNS (3件)
('instagram_follow', 'Instagramフォロー',    '店舗Instagramをフォローする',                      'sns',       1, 1, 200,  'user_claim',  140),
('story_post',       'ストーリー投稿',       '店舗をメンションしてストーリー投稿する',            'sns',       2, 2, 400,  'user_claim',  150),
('google_review',    'Google口コミ',         'Google口コミを投稿する',                           'sns',       3, 3, 700,  'user_claim',  160),
-- 紹介・コミュニティ (2件)
('newbie_support',   '初来店者サポート',     '新規のお客様にゲームや店の説明をする',              'community', 3, 3, 700,  'staff_grant', 170),
('monthly_ambassador','月間アンバサダー',    '月間で交流・紹介・SNS貢献が特に高い',              'community', 5, 8, 3000, 'staff_grant', 180)
ON CONFLICT (code) DO NOTHING;
