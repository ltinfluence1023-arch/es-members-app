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
