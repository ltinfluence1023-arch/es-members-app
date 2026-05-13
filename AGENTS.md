# flair bar es — Claude エージェント向けガイド

このファイルはチーム開発において **全員のClaude** が読み込むインストラクションです。
コードを書く前に必ず通読し、規約に従ってください。

---

## ⚠️ Next.js バージョン警告

<!-- BEGIN:nextjs-agent-rules -->
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

このプロジェクトは **Next.js 16.2.4（App Router / Turbopack）** を使用します。

---

## 1. プロジェクト概要

「flair bar es」（札幌のバー）の会員管理プラットフォーム。**1つのSupabase DBを3システムで共有**。

| システム | リポジトリ | 役割 |
|---------|----------|------|
| **本リポジトリ** | `es-app` | 顧客向けアプリ＋管理画面 |
| ポーカー管理 | `es-poker` | 別リポジトリ。同じSupabase DB |

**本番URL**: https://es-app-livid.vercel.app

---

## 2. 技術スタック

| 項目 | 技術 |
|------|------|
| フレームワーク | Next.js 16.2.4 (App Router / Turbopack) |
| 言語 | TypeScript strict |
| UI | Tailwind CSS v4, shadcn/ui |
| DB / Auth / Storage | Supabase |
| パッケージ管理 | **pnpm**（npm/yarn は使わない） |
| ホスティング | Vercel |

---

## 3. ディレクトリ構成

```
app/
├── (admin)/admin/      # 管理画面（Route Group）
├── (customer)/         # 顧客向け画面（Route Group）
├── api/                # サーバーサイドAPI routes
├── admin-login/        # 管理者ログイン
├── login/ signup/      # 顧客認証
└── globals.css         # Tailwindテーマ（デザイントークン定義場所）

components/
├── admin/              # 管理画面コンポーネント
├── customer/           # 顧客向けコンポーネント
└── ui/                 # shadcn/ui（原則変更しない）

lib/
├── admin/auth.ts       # isMaster() / isAdmin() 権限チェック
├── admin/audit.ts      # recordAudit() 操作ログ
├── supabase/           # client.ts / server.ts / admin.ts
├── types/database.ts   # DB型定義（手動管理）
└── utils/
    ├── businessDay.ts  # ★ 営業日計算（06:00 JST起算）
    ├── chipDelta.ts    # ★ チップ増減の正準ロジック（必読）
    └── geo.ts          # 位置情報検証（Haversine）

docs/
├── HANDOVER.md         # 詳細な引き継ぎドキュメント
├── migrations/         # DBマイグレーションSQL（時系列）
└── db-schema-fixed.sql # 初期スキーマ
```

---

## 4. コーディング規約

### Supabaseクライアントの使い分け（必須）

| 用途 | 使うクライアント |
|------|---------------|
| Server Component / API（認証済みユーザー） | `createClient` from `@/lib/supabase/server` |
| 他ユーザーのデータ参照・書き込み | `createAdminClient` from `@/lib/supabase/admin` |
| Client Component | `createClient` from `@/lib/supabase/client` |

> 自分のデータ取得でも adminClient を使う場面が多い（RLS事故防止）。

### 権限チェック

```typescript
import { isMaster, isAdmin } from "@/lib/admin/auth";
// isMaster() = マスター権限、isAdmin() = スタッフ含む管理者全員
```

### 操作ログ（管理画面の変更操作は必須）

```typescript
import { recordAudit } from "@/lib/admin/audit";
await recordAudit({ action: "...", category: "...", summary: "...", ... });
```

### チップ増減（必ずこの関数を使う）

```typescript
import { chipDeltaForUser, netChangeByUser } from "@/lib/utils/chipDelta";
// ランキング・残高再計算・履歴グラフ等、すべてこれを使う
// 独自計算を書かないこと
```

### 営業日

```typescript
import { getBusinessDayStart } from "@/lib/utils/businessDay";
// 06:00 JST起算。日次集計はこれを基準にする
```

### スタイル

- 新しいアニメーション・デザイントークンは `app/globals.css` に追加
- `components/ui/` の shadcn コンポーネントは原則変更しない

---

## 5. 重要なビジネスロジック（落とし穴）

### ⚠️ `seat_out` トランザクションが逆

`chip_transactions` の `seat_out` タイプだけ特殊:
- `from_user_id` に「チップを**受け取る**ユーザー」が入る（ポーカー側の慣習）
- トリガー対象外。ポーカーシステムが `chip_balance` を直接 UPDATE

### ⚠️ 管理アカウントと顧客アカウントの混在

- 顧客: `public.users` にレコードあり
- 管理者: `public.admin_users` のみ（メールは `xxx@admin.local` の合成形式）
- スタッフ作成後、`/api/admin/staff/cleanup` で `public.users` の行を即削除

### ⚠️ `chip_transactions_type_check` 変更時

`seat_out`, `withdraw` など es-poker が投入するタイプも含めること。

### GDP の定義

```
GDP = sum(amount) WHERE type='transfer' AND to_user_id IS NOT NULL
```

レポート・ランキング・チェックイン画面すべてこの定義で統一。

---

## 6. 環境変数

`.env.example` を参照。ローカルは `.env.local` を作成（Gitignore対象）。

```bash
cp .env.example .env.local
# 実際の値はチームの共有チャンネルを参照
```

---

## 7. よくある作業

### ローカル開発

```bash
pnpm install
pnpm dev   # http://localhost:3000
```

### 本番デプロイ

```bash
pnpm build && vercel --prod --yes
# ビルド失敗時: rm -rf .next && pnpm build
```

### DBマイグレーション

1. `docs/migrations/YYYY-MM-DD_<name>.sql` を作成（idempotentに書く）
2. Supabase Dashboard → SQL Editor で実行
3. `lib/types/database.ts` を手動更新
4. コード更新 → デプロイ

---

## 8. ブランチ運用

```
main        ← 本番（直接pushしない）
feature/xxx ← 機能追加
fix/xxx     ← バグ修正
```

詳細は `CONTRIBUTING.md` を参照。
