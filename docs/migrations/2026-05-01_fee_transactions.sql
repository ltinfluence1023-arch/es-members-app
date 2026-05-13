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
