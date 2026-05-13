-- Add birthday and gender to users
alter table users
  add column if not exists birthday date,
  add column if not exists gender text check (gender in ('male', 'female', 'other'));
