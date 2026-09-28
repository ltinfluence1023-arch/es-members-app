-- ============================================================
-- 1. 管理アカウントに「ディーラー」権限を追加
-- 2. 旧アプリからの引き継ぎ申請
-- ============================================================
--
-- 権限:
--   admin  = マスター（全機能）
--   staff  = スタッフ（当日のチェックイン情報・自身のPW変更）
--   dealer = ディーラー（スタッフ + ポーカー業務）
--   画面・APIごとの可否は lib/admin/permissions.ts で管理する。
--
-- 引き継ぎ:
--   お客様が旧アプリの会員ID・名前・チップ残高を申請 → マスターが旧データと手作業で照合 →
--   承認すると chip_transactions type='migration'（to_user_id=顧客）で残高に加算（トリガーで反映）。
--   'migration' はランキング集計から除外する（lib/utils/chipDelta.ts）。
-- ============================================================

-- 1. ディーラー権限
alter table admin_users drop constraint if exists admin_users_role_check;
alter table admin_users
  add constraint admin_users_role_check check (role in ('admin', 'staff', 'dealer'));

-- 2. chip_transactions に 'migration' を追加（既存タイプはすべて維持）
alter table chip_transactions drop constraint if exists chip_transactions_type_check;
alter table chip_transactions
  add constraint chip_transactions_type_check
  check (type in (
    'checkin','transfer','admin','fee',
    'seat_out','withdraw','purchase','coupon',
    'quiz','achievement','blackjack','migration'
  ));

-- 3. 引き継ぎ申請
create table if not exists legacy_migration_requests (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  legacy_member_id  text not null,
  legacy_name       text not null,
  reported_chips    int  not null check (reported_chips >= 0),
  status            text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  granted_chips     int  check (granted_chips >= 0),
  review_note       text,
  reviewed_by       uuid references admin_users(id) on delete set null,
  created_at        timestamptz not null default now(),
  reviewed_at       timestamptz
);

-- 申請中は1人1件、承認は 1人1回・旧会員IDごとに1回
create unique index if not exists uq_legacy_req_pending_user
  on legacy_migration_requests (user_id) where status = 'pending';
create unique index if not exists uq_legacy_req_approved_user
  on legacy_migration_requests (user_id) where status = 'approved';
create unique index if not exists uq_legacy_req_approved_member
  on legacy_migration_requests (legacy_member_id) where status = 'approved';
create index if not exists idx_legacy_req_status
  on legacy_migration_requests (status, created_at desc);

alter table legacy_migration_requests enable row level security;

-- 4. 承認（申請の確定とチップ付与を1トランザクションで行う）
create or replace function legacy_migration_approve(
  p_request_id uuid,
  p_chips      int,
  p_staff_id   uuid,
  p_note       text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req legacy_migration_requests%rowtype;
begin
  if p_chips < 0 then raise exception 'INVALID_AMOUNT'; end if;

  select * into v_req from legacy_migration_requests
   where id = p_request_id and status = 'pending' for update;
  if not found then raise exception 'REQUEST_NOT_PENDING'; end if;

  if exists (select 1 from legacy_migration_requests
              where status = 'approved'
                and (legacy_member_id = v_req.legacy_member_id or user_id = v_req.user_id)) then
    raise exception 'ALREADY_MIGRATED';
  end if;

  update legacy_migration_requests
     set status = 'approved', granted_chips = p_chips, review_note = p_note,
         reviewed_by = p_staff_id, reviewed_at = now()
   where id = p_request_id;

  if p_chips > 0 then
    insert into chip_transactions (to_user_id, amount, type, memo, created_by)
    values (v_req.user_id, p_chips, 'migration', '旧アプリから引き継ぎ（会員ID ' || v_req.legacy_member_id || '）', p_staff_id);
  end if;
end;
$$;

revoke execute on function legacy_migration_approve(uuid, int, uuid, text) from public, anon, authenticated;
