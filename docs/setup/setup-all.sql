-- ============================================================
-- es-app DB 一括セットアップ（新規 Supabase プロジェクト用）
-- ⚠️ 自動生成ファイル: 直接編集しないこと
--    再生成: bash scripts/build-setup-sql.sh
-- ============================================================

-- ===== docs/setup/schema-base.sql =====
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists ranks (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  required_visit_count int not null default 0,
  checkin_bonus int not null default 500 check (checkin_bonus >= 0),
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into ranks (name, required_visit_count, checkin_bonus, display_order)
values
  ('Bronze', 0, 500, 1),
  ('Silver', 10, 600, 2),
  ('Gold', 30, 800, 3),
  ('Platinum', 100, 1000, 4)
on conflict (name) do nothing;

create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  email_or_phone text not null unique,
  chip_balance int not null default 0 check (chip_balance >= 0),
  point_balance int not null default 0 check (point_balance >= 0),
  total_visit_count int not null default 0,
  rank_id uuid references ranks(id),
  created_at timestamptz not null default now(),
  last_visit_at timestamptz
);

create index if not exists idx_users_nickname on users (nickname);

create table if not exists admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

create table if not exists chip_transactions (
  id uuid primary key default uuid_generate_v4(),
  from_user_id uuid references users(id),
  to_user_id uuid references users(id),
  amount int not null check (amount > 0),
  type text not null check (type in ('checkin', 'transfer', 'admin', 'event')),
  memo text,
  created_by uuid references admin_users(id),
  created_at timestamptz not null default now(),
  constraint no_self_transfer check (
    type <> 'transfer' or from_user_id is distinct from to_user_id
  ),
  constraint chip_admin_requires_memo check (
    type not in ('admin', 'event') or (memo is not null and memo <> '')
  )
);

create index if not exists idx_chip_tx_to_user on chip_transactions (to_user_id, created_at desc);
create index if not exists idx_chip_tx_from_user on chip_transactions (from_user_id, created_at desc);
create index if not exists idx_chip_tx_type on chip_transactions (type);
create index if not exists idx_chip_tx_created on chip_transactions (created_at desc);

create table if not exists point_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  amount int not null check (amount <> 0),
  type text not null check (type in (
    'accounting_reward',
    'accounting_payment',
    'ranking_reward',
    'coupon_exchange',
    'coupon_refund',
    'admin'
  )),
  memo text,
  related_coupon_id uuid,
  created_by uuid references admin_users(id),
  created_at timestamptz not null default now(),
  constraint point_admin_requires_memo check (
    type not in ('admin', 'accounting_reward', 'accounting_payment')
    or (memo is not null and memo <> '')
  )
);

create index if not exists idx_point_tx_user on point_transactions (user_id, created_at desc);
create index if not exists idx_point_tx_type on point_transactions (type);

create table if not exists visits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  bonus_chip int not null default 0,
  store_id text not null default 'main'
);

create index if not exists idx_visits_user on visits (user_id, checked_in_at desc);

-- R-201: 1日1回制限 (JST基準) — IMMUTABLEラッパー関数を使用
create or replace function to_jst_date(ts timestamptz)
returns date
language sql
immutable
as $$
  select (ts + interval '9 hours')::date;
$$;

create unique index if not exists uq_visits_one_per_day
  on visits (user_id, to_jst_date(checked_in_at), store_id);

create table if not exists notices (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  body text not null,
  image_url text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notices_published on notices (is_published, published_at desc);

create table if not exists coupon_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  point_cost int check (point_cost is null or point_cost > 0),
  valid_days int not null default 30,
  max_issuance int,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists coupons (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references coupon_templates(id),
  user_id uuid not null references users(id) on delete cascade,
  source text not null check (source in ('admin_grant', 'point_exchange', 'ranking_reward')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  reserved_at timestamptz,
  reserved_code text,
  used_at timestamptz,
  used_by uuid references admin_users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_coupons_user on coupons (user_id, used_at, expires_at);
create index if not exists idx_coupons_reserved_code on coupons (reserved_code) where reserved_code is not null;

create table if not exists qr_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  token text not null unique,
  purpose text not null check (purpose in ('user_receive', 'coupon_redeem')),
  related_id uuid,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_qr_tokens_token on qr_tokens (token);
create index if not exists idx_qr_tokens_user on qr_tokens (user_id, created_at desc);

create or replace function apply_chip_transaction()
returns trigger
language plpgsql
as $$
begin
  if new.to_user_id is not null then
    update users set chip_balance = chip_balance + new.amount where id = new.to_user_id;
  end if;
  if new.type = 'transfer' and new.from_user_id is not null then
    update users set chip_balance = chip_balance - new.amount where id = new.from_user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_apply_chip_transaction on chip_transactions;
create trigger trg_apply_chip_transaction
after insert on chip_transactions
for each row execute function apply_chip_transaction();

create or replace function apply_point_transaction()
returns trigger
language plpgsql
as $$
begin
  update users set point_balance = point_balance + new.amount where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists trg_apply_point_transaction on point_transactions;
create trigger trg_apply_point_transaction
after insert on point_transactions
for each row execute function apply_point_transaction();

create or replace function update_user_visit_stats()
returns trigger
language plpgsql
as $$
begin
  update users
     set total_visit_count = total_visit_count + 1,
         last_visit_at = new.checked_in_at
   where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists trg_update_visit_stats on visits;
create trigger trg_update_visit_stats
after insert on visits
for each row execute function update_user_visit_stats();

create or replace function update_user_rank()
returns trigger
language plpgsql
as $$
declare
  new_rank_id uuid;
begin
  select id into new_rank_id
    from ranks
   where required_visit_count <= new.total_visit_count
   order by required_visit_count desc
   limit 1;
  if new_rank_id is not null and new_rank_id is distinct from new.rank_id then
    new.rank_id := new_rank_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_update_user_rank on users;
create trigger trg_update_user_rank
before update of total_visit_count on users
for each row execute function update_user_rank();

create or replace function exchange_point_for_coupon(
  p_user_id uuid,
  p_template_id uuid
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_template coupon_templates%rowtype;
  v_user_balance int;
  v_new_coupon_id uuid;
begin
  select * into v_template from coupon_templates
   where id = p_template_id and is_active = true;
  if not found then
    raise exception 'coupon template not found';
  end if;
  if v_template.point_cost is null then
    raise exception 'coupon not exchangeable';
  end if;
  select point_balance into v_user_balance
    from users where id = p_user_id for update;
  if v_user_balance < v_template.point_cost then
    raise exception 'insufficient points';
  end if;
  insert into coupons (template_id, user_id, source, expires_at)
  values (
    p_template_id,
    p_user_id,
    'point_exchange',
    now() + (v_template.valid_days || ' days')::interval
  )
  returning id into v_new_coupon_id;
  insert into point_transactions (user_id, amount, type, memo, related_coupon_id)
  values (p_user_id, -v_template.point_cost, 'coupon_exchange', v_template.name, v_new_coupon_id);
  return v_new_coupon_id;
end;
$$;

alter table users enable row level security;
alter table chip_transactions enable row level security;
alter table point_transactions enable row level security;
alter table visits enable row level security;
alter table notices enable row level security;
alter table ranks enable row level security;
alter table admin_users enable row level security;
alter table coupons enable row level security;
alter table coupon_templates enable row level security;
alter table qr_tokens enable row level security;

create or replace function is_admin(uid uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (select 1 from admin_users where id = uid);
$$;

create policy "users_self_read" on users for select using (auth.uid() = id);
create policy "users_admin_read" on users for select using (is_admin(auth.uid()));
create policy "users_self_update" on users for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "chip_tx_self_read" on chip_transactions
  for select using (auth.uid() = from_user_id or auth.uid() = to_user_id);
create policy "chip_tx_admin_read" on chip_transactions for select using (is_admin(auth.uid()));

create policy "point_tx_self_read" on point_transactions for select using (auth.uid() = user_id);
create policy "point_tx_admin_read" on point_transactions for select using (is_admin(auth.uid()));

create policy "visits_self_read" on visits for select using (auth.uid() = user_id);
create policy "visits_admin_read" on visits for select using (is_admin(auth.uid()));

create policy "notices_public_read" on notices for select using (is_published = true);
create policy "notices_admin_all" on notices for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

create policy "ranks_public_read" on ranks for select using (true);

create policy "admin_users_admin_read" on admin_users for select using (is_admin(auth.uid()));

create policy "coupons_self_read" on coupons for select using (auth.uid() = user_id);
create policy "coupons_admin_all" on coupons for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

create policy "coupon_templates_public_read" on coupon_templates for select using (is_active = true);
create policy "coupon_templates_admin_all" on coupon_templates for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

create policy "qr_tokens_self_read" on qr_tokens for select using (auth.uid() = user_id);
create policy "qr_tokens_self_insert" on qr_tokens for insert with check (auth.uid() = user_id);



-- ===== docs/migrations/2026-04-27_admin_name.sql =====
-- Add display name to admin_users so we can show who performed each operation
alter table admin_users
  add column if not exists name text;

-- Backfill from email local-part for existing rows
update admin_users
   set name = split_part(email, '@', 1)
 where name is null;

-- Make name required going forward (after backfill)
alter table admin_users
  alter column name set not null;


-- ===== docs/migrations/2026-04-28_fix_chip_trigger_and_balance.sql =====
-- Fix 1: chip transaction trigger now deducts from_user_id for both 'transfer' AND 'admin'
create or replace function apply_chip_transaction()
returns trigger
language plpgsql
as $$
begin
  if new.to_user_id is not null then
    update users set chip_balance = chip_balance + new.amount where id = new.to_user_id;
  end if;
  if new.from_user_id is not null and new.type in ('transfer', 'admin') then
    update users set chip_balance = chip_balance - new.amount where id = new.from_user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_apply_chip_transaction on chip_transactions;
create trigger trg_apply_chip_transaction
after insert on chip_transactions
for each row execute function apply_chip_transaction();

-- Fix 2: Recalculate chip_balance for all users from chip_transactions ledger
-- (past admin reductions never decreased balance — this corrects accumulated drift)
update users u
   set chip_balance = greatest(0, coalesce(net.balance, 0))
  from (
    select user_id,
           sum(amount) as balance
      from (
        select to_user_id   as user_id,  amount as amount
          from chip_transactions
         where to_user_id is not null
        union all
        select from_user_id as user_id, -amount as amount
          from chip_transactions
         where from_user_id is not null
           and type in ('transfer', 'admin')
      ) flows
     group by user_id
  ) net
 where u.id = net.user_id;


-- ===== docs/migrations/2026-04-28_user_profile_fields.sql =====
-- Add birthday and gender to users
alter table users
  add column if not exists birthday date,
  add column if not exists gender text check (gender in ('male', 'female', 'other'));


-- ===== docs/migrations/2026-04-30_avatar_url.sql =====
-- Add avatar_url column to users for cross-system access (e.g. poker dealer system)
alter table users
  add column if not exists avatar_url text;

-- Optional backfill (run separately if needed):
-- Replace YOUR_SUPABASE_URL with your project URL (e.g. https://xyz.supabase.co)
-- Only sets URLs for users who have an avatar file in storage.
--
-- update users u
--    set avatar_url = 'YOUR_SUPABASE_URL/storage/v1/object/public/avatars/' || u.id
--   from storage.objects o
--  where o.bucket_id = 'avatars'
--    and o.name = u.id::text;


-- ===== docs/migrations/2026-05-01_fee_transactions.sql =====
-- 1. Allow 'fee' type in chip_transactions
alter table chip_transactions
  drop constraint if exists chip_transactions_type_check;

alter table chip_transactions
  add constraint chip_transactions_type_check
  check (type in ('transfer', 'checkin', 'admin', 'purchase', 'coupon', 'fee'));

-- 2. Update trigger to handle 'fee' (deduct from from_user_id like transfer/admin)
create or replace function apply_chip_transaction()
returns trigger
language plpgsql
as $$
begin
  if new.to_user_id is not null then
    update users set chip_balance = chip_balance + new.amount where id = new.to_user_id;
  end if;
  if new.from_user_id is not null and new.type in ('transfer', 'admin', 'fee') then
    update users set chip_balance = chip_balance - new.amount where id = new.from_user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_apply_chip_transaction on chip_transactions;
create trigger trg_apply_chip_transaction
after insert on chip_transactions
for each row execute function apply_chip_transaction();

-- 3. Create fee_transactions table (fee pool ledger)
create table if not exists fee_transactions (
  id uuid primary key default uuid_generate_v4(),
  amount int not null,
  source text not null check (source in ('transfer_fee', 'rake', 'manual_add', 'manual_subtract')),
  memo text,
  related_user_id uuid references users(id) on delete set null,
  related_chip_tx_id uuid references chip_transactions(id) on delete set null,
  created_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_fee_transactions_created_at on fee_transactions (created_at desc);
create index if not exists idx_fee_transactions_source on fee_transactions (source);


-- ===== docs/migrations/2026-05-02_audit_logs.sql =====
create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  action text not null,                    -- e.g. 'admin_login', 'coupon_issue', 'customer_delete'
  category text not null,                  -- 'auth' | 'coupon' | 'customer' | 'fee' | 'chip' | 'point' | 'staff' | 'other'
  summary text,                            -- short human-readable description
  target_type text,                        -- e.g. 'user', 'coupon_template'
  target_id uuid,
  target_label text,
  details jsonb,                           -- arbitrary structured info
  actor_id uuid references admin_users(id) on delete set null,
  actor_name text,                         -- snapshot at time of action
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_created_at on audit_logs (created_at desc);
create index if not exists idx_audit_logs_actor on audit_logs (actor_id, created_at desc);
create index if not exists idx_audit_logs_category on audit_logs (category, created_at desc);


-- ===== docs/migrations/2026-05-02_coupon_v2.sql =====
-- Add new fields to coupon_templates: subtitle, image, notice
alter table coupon_templates
  add column if not exists subtitle text,
  add column if not exists image_url text,
  add column if not exists notice text;


-- ===== docs/migrations/2026-05-03_staff_password_view.sql =====
-- Store the latest set password so masters can view (not change) staff credentials.
-- Security note: this is plaintext storage by design per business requirement.
-- Access is restricted to the master role via API only — never exposed to staff.
alter table admin_users
  add column if not exists password_plain text;


-- ===== docs/migrations/2026-05-06_checkin_point.sql =====
-- Allow 'checkin' as a point_transactions type
alter table point_transactions
  drop constraint if exists point_transactions_type_check;

alter table point_transactions
  add constraint point_transactions_type_check
  check (type in (
    'accounting_reward',
    'accounting_payment',
    'ranking_reward',
    'coupon_exchange',
    'coupon_refund',
    'admin',
    'checkin'
  ));


-- ===== docs/migrations/2026-05-13_achievements.sql =====
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


-- ===== docs/migrations/2026-05-13_daily_quiz.sql =====
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


-- ===== docs/migrations/2026-05-14_blackjack.sql =====
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


-- ===== docs/migrations/2026-05-14_blackjack_trigger.sql =====
-- ============================================================
-- BJ ランキング対応: トリガーを blackjack タイプに対応させる
-- ============================================================
--
-- 背景:
--   apply_chip_transaction トリガーは to_user_id が設定されていれば
--   chip_balance += amount を無条件に実行する。
--   BJ ペイアウトは to_user_id でトリガー加算に頼っていたが、
--   blackjack type が chip_transactions_type_check に未登録だと
--   INSERT 失敗 → トリガー不発 → 残高もランキングも反映されない。
--
-- 対応方針:
--   BJ は残高管理を全て direct UPDATE で行い、chip_transactions は
--   「ランキング・履歴記録」専用とする。
--   トリガーが blackjack type の to_user_id で二重加算しないよう除外。
-- ============================================================

CREATE OR REPLACE FUNCTION apply_chip_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- blackjack は残高を direct UPDATE で管理するためトリガー対象外
  IF NEW.type = 'blackjack' THEN
    RETURN NEW;
  END IF;

  -- その他の type: to_user_id があれば加算
  IF NEW.to_user_id IS NOT NULL THEN
    UPDATE users SET chip_balance = chip_balance + NEW.amount WHERE id = NEW.to_user_id;
  END IF;

  -- transfer / admin: from_user_id からも減算
  IF NEW.from_user_id IS NOT NULL AND NEW.type IN ('transfer', 'admin') THEN
    UPDATE users SET chip_balance = chip_balance - NEW.amount WHERE id = NEW.from_user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー再作成（関数を差し替えるだけで自動反映されるが念のため）
DROP TRIGGER IF EXISTS trg_apply_chip_transaction ON chip_transactions;
CREATE TRIGGER trg_apply_chip_transaction
  AFTER INSERT ON chip_transactions
  FOR EACH ROW EXECUTE FUNCTION apply_chip_transaction();


-- ===== docs/migrations/2026-05-23_add_line_user_id.sql =====
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


-- ===== docs/migrations/2026-09-24_enable_rls_remaining.sql =====
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

select 'setup completed' as result;
