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
