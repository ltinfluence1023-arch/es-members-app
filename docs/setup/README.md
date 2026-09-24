# 新規環境セットアップ（Supabase）

Supabase プロジェクトを新しく作ったときの手順。
（2026-09 にプロジェクトが消失し、この手順で再構築した）

## ファイル

| ファイル | 内容 |
|---------|------|
| `setup-all.sql` | 全スキーマ一括（`schema-base.sql` + `docs/migrations/*.sql` を日付順に連結）。**自動生成** |
| `schema-base.sql` | 初期スキーマ（旧 `docs/db-schema-fixed.sql`） |
| `create-master-admin.sql` | マスター管理者を `admin_users` に登録 |

## 手順

1. **スキーマ作成**
   Dashboard → SQL Editor に `setup-all.sql` を全文貼り付けて実行。
   最後に `setup completed` が表示されれば OK。

2. **マスター管理者作成**
   1. Authentication → Add user → `es000@admin.local` とパスワードを入力、Auto Confirm User を ON
   2. SQL Editor で `create-master-admin.sql` を実行し、`role = admin` の行が出ることを確認

3. **環境変数**（Project Settings → API）
   以下を **ローカル `.env.local`・Vercel** の2か所で更新する。
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`（秘密。チャット等に貼らない）

   Vercel は更新後に再デプロイ（`pnpm build && vercel --prod --yes`）。

4. **Storage**
   バケット（`avatars` など）は初回アップロード時にアプリが自動作成するので作業不要。

## マイグレーションを追加したとき

1. `docs/migrations/YYYY-MM-DD_<name>.sql` を作成（idempotent に書く）
2. `bash scripts/build-setup-sql.sh` で `setup-all.sql` を再生成してコミット

## 注意

- 無料プランは一定期間アクセスがないと自動で一時停止し、長期間放置すると復元できなくなる。
  定期的に Dashboard を確認すること。
