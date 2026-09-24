-- ============================================================
-- マスター管理者の登録
-- ============================================================
-- 事前に Supabase Dashboard → Authentication → Add user で
-- ログイン用アカウントを作成しておくこと（Auto Confirm User を ON）。
--   メール: <ログインID>@admin.local   例) es000@admin.local
-- 管理画面へは「ログインID」（@admin.local の前）とパスワードでログインする。
--
-- メールアドレスと表示名は必要に応じて書き換えて実行。
-- ============================================================

insert into admin_users (id, email, name, role)
select id, email, 'マスター', 'admin'
  from auth.users
 where email = 'es000@admin.local'
on conflict (id) do nothing;

select id, email, name, role from admin_users;
