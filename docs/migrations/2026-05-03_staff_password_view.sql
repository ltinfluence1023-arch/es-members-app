-- Store the latest set password so masters can view (not change) staff credentials.
-- Security note: this is plaintext storage by design per business requirement.
-- Access is restricted to the master role via API only — never exposed to staff.
alter table admin_users
  add column if not exists password_plain text;
