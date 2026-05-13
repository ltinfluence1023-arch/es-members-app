# flair bar es — 開発参加ガイド

**flair bar es**（札幌のバー）の会員管理アプリです。
顧客向けアプリ・管理画面を1つのリポジトリで管理しています。

---

## 参加前の準備

### 1. 必要なツールをインストール

| ツール | 確認コマンド | インストール先 |
|--------|-------------|---------------|
| Node.js 20以上 | `node -v` | https://nodejs.org |
| pnpm | `pnpm -v` | `npm install -g pnpm` |
| Git | `git -v` | https://git-scm.com |

### 2. SSH鍵をGitHubに登録（初回のみ）

```bash
# SSH鍵があるか確認
ls ~/.ssh/*.pub

# なければ作成
ssh-keygen -t ed25519 -C "あなたのメールアドレス"

# 公開鍵を表示してコピー
cat ~/.ssh/id_ed25519.pub
```

コピーした鍵を → https://github.com/settings/ssh/new に貼り付けて登録。

登録確認：
```bash
ssh -T git@github.com
# → "Hi xxx! You've successfully authenticated..." と表示されればOK
```

---

## セットアップ

### 3. リポジトリをクローン

```bash
git clone git@github.com:ltinfluence1023-arch/es-members-app.git
cd es-members-app
```

### 4. 依存関係をインストール

```bash
pnpm install
```

### 5. 環境変数を設定

```bash
cp .env.example .env.local
```

`.env.local` を開いて、チームの共有チャンネルから取得した実際の値を入力してください。

> ⚠️ `.env.local` は絶対にコミットしないでください。gitignoreで除外済みです。

### 6. 開発サーバーを起動

```bash
pnpm dev
```

→ http://localhost:3000 をブラウザで開く

---

## Claude Code での開発

### Claude Code をインストール（未インストールの場合）

```bash
npm install -g @anthropic-ai/claude-code
```

### プロジェクトで Claude を起動

```bash
cd es-members-app
claude
```

`AGENTS.md` がプロジェクト規約として自動的に読み込まれ、チーム全員のClaudeが同じルールで動きます。

---

## 開発の流れ

### 毎回の作業手順

```bash
# 1. 最新のコードを取得
git checkout main
git pull origin main

# 2. 作業ブランチを作成
git checkout -b feature/作業内容の名前
# 例: feature/add-coupon-filter

# 3. 開発（Claude に作業を依頼しながら進める）
claude

# 4. 変更をコミット
git add <変更したファイル>
git commit -m "feat: ○○機能を追加"

# 5. GitHubにpush
git push origin feature/作業内容の名前

# 6. GitHub上でPull Requestを作成
# → https://github.com/ltinfluence1023-arch/es-members-app
```

### コミットメッセージの形式

```
feat:     機能追加
fix:      バグ修正
style:    デザイン変更
refactor: リファクタ
docs:     ドキュメント変更
```

### ブランチのルール

| ブランチ | 用途 |
|---------|------|
| `main` | 本番（直接pushしない） |
| `feature/xxx` | 機能追加 |
| `fix/xxx` | バグ修正 |

---

## プロジェクト構成

```
es-members-app/
├── app/
│   ├── (admin)/admin/   # 管理画面
│   ├── (customer)/      # 顧客向け画面
│   ├── api/             # APIルート
│   └── globals.css      # デザインテーマ
├── components/
│   ├── admin/           # 管理画面コンポーネント
│   ├── customer/        # 顧客向けコンポーネント
│   └── ui/              # 共通UIパーツ
├── lib/
│   ├── supabase/        # DBクライアント
│   ├── types/           # 型定義
│   └── utils/           # 共通ユーティリティ
└── docs/
    ├── HANDOVER.md      # 詳細な仕様書
    └── migrations/      # DBマイグレーション履歴
```

---

## よくある作業

### ビルド確認

```bash
pnpm build
```

### 本番デプロイ（担当者のみ）

```bash
pnpm build && vercel --prod --yes
```

---

## 困ったとき

| 内容 | 参照先 |
|------|--------|
| 詳細な仕様・落とし穴 | [docs/HANDOVER.md](docs/HANDOVER.md) |
| 業務ルール | [docs/business-rules.md](docs/business-rules.md) |
| Claudeへの規約 | [AGENTS.md](AGENTS.md) |
| PR・ブランチ運用 | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Supabase管理画面 | チームの共有チャンネルを参照 |
| Vercel管理画面 | チームの共有チャンネルを参照 |
