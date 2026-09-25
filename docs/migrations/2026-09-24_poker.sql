-- ============================================================
-- ポーカー（リングゲーム）卓管理
-- ============================================================
--
-- 背景:
--   外部の es-poker を廃止し、es-app の管理画面に統合する。
--   ディーラーが卓の席をタップ → 顧客のマイQRを読み取り → 着席させる。
--
-- チップの流れ:
--   引き出し: アカウント残高 → 卓        chip_transactions type='withdraw'（from_user_id=顧客）
--   購入    : 現金 → 卓（残高は動かない） chip_transactions には記録しない（poker_sessions.purchase_total）
--   退席    : 卓の残チップ → アカウント残高 chip_transactions type='seat_out'（from_user_id=受け取る顧客 ※既存慣習）
--   レーキ  : fee_transactions source='rake'（API から直接 INSERT）
--
--   withdraw / seat_out は apply_chip_transaction トリガーの対象外のため、
--   残高更新は以下の関数内で直接 UPDATE する（同一トランザクションで整合性を保証）。
-- ============================================================

-- 1. 卓
create table if not exists poker_tables (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  seat_count  int  not null default 10 check (seat_count between 2 and 10),
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

insert into poker_tables (name, sort_order)
select 'Table 1', 1
 where not exists (select 1 from poker_tables);

-- 2. 着席セッション（1着席 = 1行。退席で closed）
create table if not exists poker_sessions (
  id              uuid primary key default gen_random_uuid(),
  table_id        uuid not null references poker_tables(id),
  seat_no         int  not null check (seat_no >= 1),
  user_id         uuid not null references users(id) on delete cascade,
  status          text not null default 'seated' check (status in ('seated', 'closed')),
  withdraw_total  int  not null default 0 check (withdraw_total >= 0),
  purchase_total  int  not null default 0 check (purchase_total >= 0),
  cash_out        int  check (cash_out >= 0),
  seated_by       uuid references admin_users(id) on delete set null,
  closed_by       uuid references admin_users(id) on delete set null,
  seated_at       timestamptz not null default now(),
  closed_at       timestamptz
);

-- 1席に1人、1人1席
create unique index if not exists uq_poker_sessions_seat
  on poker_sessions (table_id, seat_no) where status = 'seated';
create unique index if not exists uq_poker_sessions_user
  on poker_sessions (user_id) where status = 'seated';
create index if not exists idx_poker_sessions_user
  on poker_sessions (user_id, seated_at desc);

alter table poker_tables   enable row level security;
alter table poker_sessions enable row level security;

-- 3. 着席（引き出し and/or 購入）
create or replace function poker_seat_in(
  p_table_id uuid,
  p_seat_no  int,
  p_user_id  uuid,
  p_withdraw int,
  p_purchase int,
  p_staff_id uuid,
  p_memo     text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seat_count int;
  v_balance    int;
  v_session_id uuid;
begin
  if p_withdraw < 0 or p_purchase < 0 or p_withdraw + p_purchase <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select seat_count into v_seat_count
    from poker_tables where id = p_table_id and is_active;
  if not found then raise exception 'TABLE_NOT_FOUND'; end if;
  if p_seat_no < 1 or p_seat_no > v_seat_count then raise exception 'INVALID_SEAT'; end if;

  select chip_balance into v_balance from users where id = p_user_id for update;
  if not found then raise exception 'USER_NOT_FOUND'; end if;

  if exists (select 1 from poker_sessions where user_id = p_user_id and status = 'seated') then
    raise exception 'ALREADY_SEATED';
  end if;
  if exists (select 1 from poker_sessions where table_id = p_table_id and seat_no = p_seat_no and status = 'seated') then
    raise exception 'SEAT_TAKEN';
  end if;
  if v_balance < p_withdraw then raise exception 'INSUFFICIENT_BALANCE'; end if;

  insert into poker_sessions (table_id, seat_no, user_id, withdraw_total, purchase_total, seated_by)
  values (p_table_id, p_seat_no, p_user_id, p_withdraw, p_purchase, p_staff_id)
  returning id into v_session_id;

  if p_withdraw > 0 then
    insert into chip_transactions (from_user_id, amount, type, memo, created_by)
    values (p_user_id, p_withdraw, 'withdraw', p_memo, p_staff_id);
    update users set chip_balance = chip_balance - p_withdraw where id = p_user_id;
  end if;

  return v_session_id;
end;
$$;

-- 4. 着席中の追加（引き出し and/or 購入）
create or replace function poker_add_chips(
  p_session_id uuid,
  p_withdraw   int,
  p_purchase   int,
  p_staff_id   uuid,
  p_memo       text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_balance int;
begin
  if p_withdraw < 0 or p_purchase < 0 or p_withdraw + p_purchase <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select user_id into v_user_id
    from poker_sessions where id = p_session_id and status = 'seated' for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;

  select chip_balance into v_balance from users where id = v_user_id for update;
  if v_balance < p_withdraw then raise exception 'INSUFFICIENT_BALANCE'; end if;

  update poker_sessions
     set withdraw_total = withdraw_total + p_withdraw,
         purchase_total = purchase_total + p_purchase
   where id = p_session_id;

  if p_withdraw > 0 then
    insert into chip_transactions (from_user_id, amount, type, memo, created_by)
    values (v_user_id, p_withdraw, 'withdraw', p_memo, p_staff_id);
    update users set chip_balance = chip_balance - p_withdraw where id = v_user_id;
  end if;
end;
$$;

-- 5. 退席（残チップをアカウントへ戻す）
create or replace function poker_seat_out(
  p_session_id uuid,
  p_cash_out   int,
  p_staff_id   uuid,
  p_memo       text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if p_cash_out < 0 then raise exception 'INVALID_AMOUNT'; end if;

  select user_id into v_user_id
    from poker_sessions where id = p_session_id and status = 'seated' for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;

  update poker_sessions
     set status = 'closed', cash_out = p_cash_out, closed_by = p_staff_id, closed_at = now()
   where id = p_session_id;

  if p_cash_out > 0 then
    -- seat_out は from_user_id に「受け取る」顧客を入れる（chipDelta.ts の慣習）
    insert into chip_transactions (from_user_id, amount, type, memo, created_by)
    values (v_user_id, p_cash_out, 'seat_out', p_memo, p_staff_id);
    update users set chip_balance = chip_balance + p_cash_out where id = v_user_id;
  end if;
end;
$$;

-- 関数は service_role（API）からのみ実行可能にする
revoke execute on function poker_seat_in(uuid, int, uuid, int, int, uuid, text)  from public, anon, authenticated;
revoke execute on function poker_add_chips(uuid, int, int, uuid, text)           from public, anon, authenticated;
revoke execute on function poker_seat_out(uuid, int, uuid, text)                 from public, anon, authenticated;
