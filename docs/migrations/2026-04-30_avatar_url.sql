-- Add avatar_url column to users for cross-system access (e.g. poker dealer system)
alter table users
  add column if not exists avatar_url text;

-- Optional backfill (run separately if needed):
-- Replace YOUR_SUPABASE_URL with your project URL (e.g. https://xyz.supabase.co)
-- Only sets URLs for users who have an avatar file in storage.
--
-- update users u
--    set avatar_url = 'YOUR_SUPABASE_URL/storage/v1/object/public/avatars/' || u.id
--   from storage.objects o
--  where o.bucket_id = 'avatars'
--    and o.name = u.id::text;
