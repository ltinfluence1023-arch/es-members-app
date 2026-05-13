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
