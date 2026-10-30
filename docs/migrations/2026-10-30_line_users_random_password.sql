-- ============================================================
-- LINE ログイン会員のパスワードを無効化（推測できるパスワードの廃止）
-- ============================================================
--
-- 旧コードは LINE 会員（auth.users のメール line_<userId>@line.local）のパスワードを
-- `line_<userId>_<LINE_CHANNEL_ID>` にしていた。anon key は公開値なので、
-- LINE userId を知っていれば誰でもその会員としてログインできてしまう。
-- app/api/auth/line/route.ts はパスワードを使わない形（サーバー側で magiclink を検証）に変えたので、
-- 既存会員のパスワードを誰も知らないランダム値に置き換える。
--
-- ⚠️ 実行順: 新しい app/api/auth/line/route.ts を本番にデプロイした「後」に実行すること。
--    先に実行すると、旧コードが動いている間は LINE ログインが全員失敗する。
-- 何度実行してもよい（毎回別のランダム値になるだけ）。管理アカウント（@admin.local）は対象外。
-- ============================================================

update auth.users
   set encrypted_password = extensions.crypt(
         encode(extensions.gen_random_bytes(32), 'hex'),
         extensions.gen_salt('bf')
       ),
       updated_at = now()
 where email like 'line\_%@line.local';
