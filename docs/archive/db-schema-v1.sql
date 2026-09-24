-- ============================================================
-- バー店内アプリ DB スキーマ (Supabase / PostgreSQL)
-- v2: 2通貨モデル(チップ/ポイント) + クーポン + QRトークン
-- ============================================================
-- 適用方法: Supabase Studio > SQL Editor に貼り付けて実行
-- 業務ルールは /docs/business-rules.md を参照
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- ranks: ランク設定
-- ============================================================
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

-- ============================================================
-- users: 顧客 (チップ・ポイントの2残高を保持)
-- ============================================================
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  email_or_phone text not null unique,
  -- R-001: チップ残高は0以上
  chip_balance int not null default 0 check (chip_balance >= 0),
  -- R-101: ポイント残高は0以上
  point_balance int not null default 0 check (point_balance >= 0),
  total_visit_count int not null default 0,
  rank_id uuid references ranks(id),
  created_at timestamptz not null default now(),
  last_visit_at timestamptz
);

create index if not exists idx_users_nickname on users (nickname);

-- ============================================================
-- admin_users: 管理者
-- ============================================================
create table if not exists admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- chip_transactions: チップ取引履歴
-- ============================================================
create table if not exists chip_transactions (
  id uuid primary key default uuid_generate_v4(),
  from_user_id uuid references users(id),  -- 運営付与時null
  to_user_id uuid references users(id),
  amount int not null check (amount > 0),  -- R-302
  type text not null check (type in ('checkin', 'transfer', 'admin', 'event')),
  memo text,
  created_by uuid references admin_users(id),
  created_at timestamptz not null default now(),
  -- R-301: 自己送金禁止
  constraint no_self_transfer check (
    type <> 'transfer' or from_user_id is distinct from to_user_id
  ),
  -- R-401: 管理者操作はメモ必須
  constraint chip_admin_requires_memo check (
    type not in ('admin', 'event') or (memo is not null and memo <> '')
  )
);

create index if not exists idx_chip_tx_to_user on chip_transactions (to_user_id, created_at desc);
create index if not exists idx_chip_tx_from_user on chip_transactions (from_user_id, created_at desc);
create index if not exists idx_chip_tx_type on chip_transactions (type);
create index if not exists idx_chip_tx_month on chip_transactions (date_trunc('month', created_at));

-- ============================================================
-- point_transactions: ポイント取引履歴
-- ============================================================
create table if not exists point_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  -- 正の値=付与、負の値=消費
  amount int not null check (amount <> 0),
  type text not null check (type in (
    'accounting_reward',   -- 会計還元
    'accounting_payment',  -- 会計支払
    'ranking_reward',      -- ランキング報酬
    'coupon_exchange',     -- クーポン交換消費
    'coupon_refund',       -- クーポン返還
    'admin'                -- 管理者調整
  )),
  memo text,
  related_coupon_id uuid,  -- coupons.id への参照(任意)
  created_by uuid references admin_users(id),
  created_at timestamptz not null default now(),
  -- R-401: 管理者操作・会計はメモ必須
  constraint point_admin_requires_memo check (
    type not in ('admin', 'accounting_reward', 'accounting_payment')
    or (memo is not null and memo <> '')
  )
);

create index if not exists idx_point_tx_user on point_transactions (user_id, created_at desc);
create index if not exists idx_point_tx_type on point_transactions (type);

-- ============================================================
-- visits: 来店履歴
-- ============================================================
create table if not exists visits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  bonus_chip int not null default 0,
  store_id text not null default 'main'
);

create index if not exists idx_visits_user on visits (user_id, checked_in_at desc);

-- R-201: 1日1回制限 (JST基準)
create unique index if not exists uq_visits_one_per_day
  on visits (user_id, ((checked_in_at at time zone 'Asia/Tokyo')::date), store_id);

-- ============================================================
-- notices: お知らせ
-- ============================================================
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

-- ============================================================
-- coupon_templates: クーポンの雛形
-- ============================================================
create table if not exists coupon_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  -- ポイント交換可能な場合のみ設定。null=交換不可(管理発行のみ)
  point_cost int check (point_cost is null or point_cost > 0),
  -- 利用可能日数(発行から)
  valid_days int not null default 30,
  -- 一度に発行できる上限(null=無制限)
  max_issuance int,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- coupons: 顧客に発行された個別クーポン
-- ============================================================
create table if not exists coupons (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references coupon_templates(id),
  user_id uuid not null references users(id) on delete cascade,
  source text not null check (source in ('admin_grant', 'point_exchange', 'ranking_reward')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  -- 使用予約 (R-505)
  reserved_at timestamptz,
  reserved_code text,  -- 6桁コード
  -- 使用確定 (R-507)
  used_at timestamptz,
  used_by uuid references admin_users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_coupons_user on coupons (user_id, used_at, expires_at);
create index if not exists idx_coupons_reserved_code on coupons (reserved_code) where reserved_code is not null;

-- ============================================================
-- qr_tokens: マイQR/クーポン提示の短期トークン
-- ============================================================
create table if not exists qr_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  token text not null unique,
  purpose text not null check (purpose in ('user_receive', 'coupon_redeem')),
  related_id uuid,  -- coupon_redeem時はcoupons.id
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_qr_tokens_token on qr_tokens (token);
create index if not exists idx_qr_tokens_user on qr_tokens (user_id, created_at desc);

-- ============================================================
-- 残高更新トリガー (チップ)
-- ============================================================
create or replace function apply_chip_transaction()
returns trigger
language plpgsql
as $$
begin
  -- 受信者残高加算
  if new.to_user_id is not null then
    update users
       set chip_balance = chip_balance + new.amount
     where id = new.to_user_id;
  end if;

  -- 送信者残高減算 (transferのみ)
  if new.type = 'transfer' and new.from_user_id is not null then
    update users
       set chip_balance = chip_balance - new.amount
     where id = new.from_user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_apply_chip_transaction on chip_transactions;
create trigger trg_apply_chip_transaction
after insert on chip_transactions
for each row execute function apply_chip_transaction();

-- ============================================================
-- 残高更新トリガー (ポイント)
-- ============================================================
create or replace function apply_point_transaction()
returns trigger
language plpgsql
as $$
begin
  update users
     set point_balance = point_balance + new.amount
   where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists trg_apply_point_transaction on point_transactions;
create trigger trg_apply_point_transaction
after insert on point_transactions
for each row execute function apply_point_transaction();

-- ============================================================
-- 来店時の累計更新トリガー
-- ============================================================
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

-- ============================================================
-- ランク自動更新トリガー(来店回数到達時)
-- ============================================================
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

-- ============================================================
-- ポイント交換でクーポン発行する RPC (R-508)
-- ============================================================
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
  -- 雛形取得
  select * into v_template from coupon_templates
   where id = p_template_id and is_active = true;
  if not found then
    raise exception 'クーポンテンプレートが見つかりません';
  end if;

  if v_template.point_cost is null then
    raise exception 'このクーポンはポイント交換できません';
  end if;

  -- 残高ロック取得
  select point_balance into v_user_balance
    from users where id = p_user_id for update;

  if v_user_balance < v_template.point_cost then
    raise exception 'ポイントが不足しています';  -- R-509
  end if;

  -- クーポン発行
  insert into coupons (template_id, user_id, source, expires_at)
  values (
    p_template_id,
    p_user_id,
    'point_exchange',
    now() + (v_template.valid_days || ' days')::interval
  )
  returning id into v_new_coupon_id;

  -- ポイント消費
  insert into point_transactions (
    user_id, amount, type, memo, related_coupon_id
  ) values (
    p_user_id,
    -v_template.point_cost,
    'coupon_exchange',
    v_template.name,
    v_new_coupon_id
  );

  return v_new_coupon_id;
end;
$$;

-- ============================================================
-- Row Level Security
-- ============================================================

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

-- 管理者判定関数
create or replace function is_admin(uid uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (select 1 from admin_users where id = uid);
$$;

-- users
create policy "users_self_read" on users
  for select using (auth.uid() = id);
create policy "users_admin_read" on users
  for select using (is_admin(auth.uid()));
create policy "users_self_update" on users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- chip_transactions (R-602)
create policy "chip_tx_self_read" on chip_transactions
  for select using (
    auth.uid() = from_user_id or auth.uid() = to_user_id
  );
create policy "chip_tx_admin_read" on chip_transactions
  for select using (is_admin(auth.uid()));

-- point_transactions
create policy "point_tx_self_read" on point_transactions
  for select using (auth.uid() = user_id);
create policy "point_tx_admin_read" on point_transactions
  for select using (is_admin(auth.uid()));

-- visits
create policy "visits_self_read" on visits
  for select using (auth.uid() = user_id);
create policy "visits_admin_read" on visits
  for select using (is_admin(auth.uid()));

-- notices (公開済は全員閲覧可)
create policy "notices_public_read" on notices
  for select using (is_published = true);
create policy "notices_admin_all" on notices
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- ranks
create policy "ranks_public_read" on ranks
  for select using (true);

-- admin_users
create policy "admin_users_admin_read" on admin_users
  for select using (is_admin(auth.uid()));

-- coupons
create policy "coupons_self_read" on coupons
  for select using (auth.uid() = user_id);
create policy "coupons_admin_all" on coupons
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- coupon_templates (全員閲覧可、編集は管理者のみ)
create policy "coupon_templates_public_read" on coupon_templates
  for select using (is_active = true);
create policy "coupon_templates_admin_all" on coupon_templates
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- qr_tokens
create policy "qr_tokens_self_read" on qr_tokens
  for select using (auth.uid() = user_id);
create policy "qr_tokens_self_insert" on qr_tokens
  for insert with check (auth.uid() = user_id);

-- ============================================================
-- 注意:
--   重要なビジネスロジック (送金、チェックイン、クーポン使用)
--   はサーバー側 API ルートで service_role キーを使い、
--   トランザクション + ロック付きで実行すること。
--   RLS は読み取り保護が主目的。
-- ============================================================
