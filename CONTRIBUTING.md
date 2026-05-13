# 開発への参加ガイド

## セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/<org>/<repo>.git
cd es-app

# 依存関係インストール（pnpm必須）
pnpm install

# 環境変数を設定
cp .env.example .env.local
# .env.local の値をチームの共有チャンネルから取得して入力

# 開発サーバー起動
pnpm dev
# → http://localhost:3000
```

---

## ブランチ運用

```
main
├── feature/xxx   機能追加
└── fix/xxx       バグ修正
```

### 基本的な流れ

```bash
# 1. 最新の main から作業ブランチを作る
git checkout main
git pull origin main
git checkout -b feature/your-feature-name

# 2. 開発・コミット
git add <files>
git commit -m "feat: ○○機能を追加"

# 3. PR を出す
git push origin feature/your-feature-name
# GitHub で Pull Request を作成
```

### コミットメッセージの形式

```
<type>: <内容>

type:
  feat     機能追加
  fix      バグ修正
  style    デザイン変更
  refactor リファクタ
  docs     ドキュメント
  chore    設定・ビルド変更
```

---

## PR のルール

- `main` への直接pushは禁止
- PR には必ずテンプレートを記入
- レビュアーを最低1人アサイン
- `pnpm build` が通ることを確認してからPRを出す

---

## Claude Code の使い方

各メンバーは自分のClaudeで開発できます。
`AGENTS.md` にプロジェクト規約が書かれており、Claudeが自動的に読み込みます。

```bash
# Claude Code でプロジェクトを開く
claude

# または VS Code 拡張機能から起動
```

### ブランチごとに独立して作業する

同じリポジトリで複数人が作業する場合、`feature/` ブランチを必ず分けてください。
同じファイルを同時編集するとコンフリクトが発生します。

---

## DBマイグレーション

スキーマ変更が必要な場合:

1. `docs/migrations/YYYY-MM-DD_<説明>.sql` を作成（idempotentに書く）
2. Supabase Dashboard → SQL Editor で実行
3. `lib/types/database.ts` を更新
4. PRに「DBマイグレーション: あり」をチェック

---

## 本番デプロイ

```bash
pnpm build && vercel --prod --yes
```

**main へのマージが自動デプロイのトリガーにはなっていません（手動デプロイ）。**
Vercel のダッシュボードまたは上記コマンドで実施してください。

---

## 困ったとき

- 詳細な仕様・落とし穴 → `docs/HANDOVER.md`
- DB スキーマ → `docs/db-schema-fixed.sql` + `docs/migrations/`
- 業務ルール → `docs/business-rules.md`
