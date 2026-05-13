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
