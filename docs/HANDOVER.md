# flair bar es — プロダクト引き継ぎドキュメント

最終更新: 2026-05-11

このドキュメントは、現在の **flair bar es** プロダクト（ユーザー向け会員アプリ＋管理画面）の状態を引き継ぎ担当者向けにまとめたものです。

---

## 1. プロダクト概要

「flair bar es」(札幌のバー) の会員管理プラットフォーム。

- **ユーザー側アプリ**: 来店者向け。QRチェックイン・チップ/ポイント・ランキング・クーポンなど
- **管理画面**: 店舗スタッフ・マスター向け。顧客管理・チェックイン状況・チップ操作・クーポン発行・操作ログなど
- **ポーカーディーラー専用システム** (`es-poker`): 別リポジトリで運用。**同じ Supabase プロジェクト** を共有

3つのシステムが **1つの Supabase DB** を共有しており、データの整合性に注意が必要です。

---

## 2. 技術スタック

| 項目 | 技術 |
|------|------|
| フレームワーク | Next.js 16.2.4 (App Router / Turbopack) |
| 言語 | TypeScript（strict） |
| UI | Tailwind CSS v4, shadcn/ui, Radix UI |
| DB / Auth / Storage | Supabase (PostgreSQL + Auth + Storage) |
| 認証 | Supabase Auth（メール＋PW、+ LINE LIFF対応） |
| ホスティング | Vercel |
| パッケージマネージャ | pnpm |
| グラフ | Recharts |
| QR | `html5-qrcode`（読み取り）、`qrcode.react`（生成） |
| LINE 連携 | `@line/liff`（LIFF SDK） |
| バリデーション | Zod + React Hook Form |
| トースト | sonner |

---

## 3. 環境

### 本番
- URL: https://es-app-livid.vercel.app
- Vercelプロジェクト名: `es-app`
- Vercelチーム: `ltinfluence1023-2940s-projects`

### Supabase
- プロジェクト ID: `vjteercfticstkrueajc`
- URL: `https://vjteercfticstkrueajc.supabase.co`
- Storage バケット:
  - `avatars`（プロフィール画像、公開）
  - `coupon-images`（クーポン画像、公開）

### 環境変数（Vercel Production）

```bash
NEXT_PUBLIC_SUPABASE_URL=https://vjteercfticstkrueajc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=（anon key）
SUPABASE_SERVICE_ROLE_KEY=（service role key、サーバー側専用）

STORE_ID=main
STORE_QR_SECRET=（QR署名用）
STORE_LAT=43.0559416            # 店舗緯度（位置検証用）
STORE_LNG=141.352906            # 店舗経度
STORE_RADIUS_M=100              # 許可半径（メートル）

# LINE LIFF（任意 — 未設定なら機能無効）
NEXT_PUBLIC_LIFF_ID=（LIFF ID）
LINE_CHANNEL_ID=（チャネルID）
```

ローカル: `.env.local` を作成して同じ値を設定。

---

## 4. デプロイ手順

```bash
cd /Users/hoshiseiju/Desktop/es-app
pnpm install
pnpm build && vercel --prod --yes
```

詳細は本ドキュメント末尾の「**よくある詰まり**」参照。

---

## 5. ディレクトリ構成

```
es-app/
├── app/
│   ├── (admin)/admin/         # 管理画面 (Route Group)
│   │   ├── audit-logs/         # 操作ログ（マスター）
│   │   ├── checkins/           # チェックイン状況
│   │   ├── coupons/            # クーポン管理
│   │   │   ├── issue/          # セグメント発行
│   │   │   ├── redeem/         # 消込
│   │   │   └── templates/      # 雛形管理
│   │   ├── customers/          # 顧客一覧 / 顧客詳細
│   │   ├── fees/               # 手数料総計（管理チップ残高）
│   │   ├── notices/            # お知らせ管理
│   │   ├── rankings/           # ランキング履歴
│   │   ├── reports/            # レポート
│   │   ├── scan/               # スタッフ用QRスキャン
│   │   ├── staff/              # スタッフ管理
│   │   ├── store-qr/           # 店舗QR
│   │   └── transactions/       # 取引履歴
│   ├── (customer)/             # ユーザー向け (Route Group)
│   │   ├── coupons/            # クーポン一覧・詳細
│   │   ├── history/            # チップ/ポイント履歴
│   │   ├── home/               # ホーム
│   │   ├── menu/               # サイドメニュー配下（プロフィール等）
│   │   ├── notices/            # お知らせ
│   │   ├── profile/[id]/       # 他人プロフィール
│   │   ├── qr/                 # QR表示
│   │   ├── ranking/            # ランキング
│   │   ├── scan/               # 個別スキャンページ
│   │   └── transfer/[token]/   # 送付フォーム
│   ├── admin-login/            # 管理者ログイン
│   ├── api/                    # サーバーAPI
│   │   ├── admin/              # 管理API
│   │   ├── auth/               # 認証（signup, line）
│   │   ├── checkin/            # チェックイン
│   │   ├── coupons/            # 顧客クーポン操作
│   │   ├── me/                 # 自分の情報
│   │   ├── profile/            # プロフィール
│   │   ├── qr/                 # QR生成
│   │   ├── ranking/            # ランキング
│   │   ├── store/              # 店舗関連（live/）
│   │   └── transfer/           # 送付
│   ├── login/                  # 顧客ログイン
│   ├── signup/                 # 顧客新規登録
│   └── globals.css             # Tailwindテーマ
├── components/
│   ├── admin/                  # 管理画面コンポーネント
│   ├── customer/               # ユーザー側コンポーネント
│   └── ui/                     # shadcn/ui
├── lib/
│   ├── admin/                  # admin/auth.ts, audit.ts
│   ├── liff/                   # LINE LIFF クライアント
│   ├── supabase/               # supabase クライアント (client/server/admin)
│   ├── types/database.ts       # DB 型定義
│   └── utils/                  # 共通ユーティリティ
│       ├── avatar.ts
│       ├── businessDay.ts      # 営業日計算（06:00 JST 起算）
│       ├── chipDelta.ts        # ★ チップ増減の正準ロジック
│       ├── geo.ts              # 位置検証（Haversine）
│       └── getCurrentPosition.ts
├── docs/
│   ├── HANDOVER.md             # ★ このファイル
│   ├── business-rules.md       # 業務ルール（旧）
│   ├── db-schema.sql           # 初期スキーマ
│   ├── db-schema-fixed.sql     # 修正版初期スキーマ
│   ├── requirements.md
│   ├── screens.md
│   └── migrations/             # ★ 追加マイグレーションSQL（日付順）
└── middleware.ts               # 認証・ルート保護
```

---

## 6. DBスキーマ（重要テーブル）

### users（顧客）
顧客アカウント。`auth.users` と 1:1。

```sql
id uuid PK (auth.users)
nickname text
email_or_phone text unique
chip_balance int    -- ★ 残高（リアルタイム更新）
point_balance int
total_visit_count int
rank_id uuid
created_at, last_visit_at
birthday date
gender 'male'|'female'|'other'
avatar_url text     -- Storage URL（cache-bust付き）
```

### admin_users（管理アカウント）
スタッフ・マスター。`auth.users` と 1:1。

```sql
id uuid PK (auth.users)
email text unique          -- 合成メール: {loginId}@admin.local
name text
role 'admin'|'staff'       -- admin=マスター、staff=スタッフ
password_plain text        -- ★ マスターが閲覧用に保存（要件）
created_at
```

### chip_transactions（チップ取引台帳）★ 最重要
**残高はすべてここから計算可能** にする方針。

```sql
id, type, amount(positive), from_user_id, to_user_id,
memo, created_by(admin_users), created_at
```

`type` の種類:
| type | 意味 | from | to | 残高影響 |
|------|------|------|----|---------|
| checkin | チェックインボーナス | null | 来店者 | to: +amount |
| transfer | ユーザー間送付 | 送り主 | 受取人 | from: -amount / to: +amount |
| admin | 管理者付与/減算 | (減算時)対象 | (付与時)対象 | 該当方向に |
| fee | 送付手数料(10%) | 送り主 | null | from: -amount |
| seat_out | **ポーカー卓退席（特殊）** | 受取人 | null | from: **+amount** |
| withdraw | 出金 | 対象 | null | from: -amount |
| purchase | 購入消費 | 対象 | null | from: -amount |
| coupon | クーポン消費 | 対象 | null | from: -amount |

**⚠️ `seat_out` だけ特殊**: ポーカーシステムが `from_user_id` に「チップを受け取るユーザー」を入れる慣習。

**残高更新トリガー** `apply_chip_transaction`（`docs/migrations/2026-05-01_fee_transactions.sql`）:
- `to_user_id` があれば `+amount`
- `from_user_id` があり `type IN ('transfer', 'admin', 'fee')` なら `-amount`
- `seat_out` / `withdraw` などはトリガー対象外（ポーカーシステム等が直接 `chip_balance` を更新）

### point_transactions（ポイント取引台帳）
```sql
id, user_id, amount(signed), type, memo, related_coupon_id,
created_by(admin_users), created_at
```
type: `accounting_reward`, `accounting_payment`, `ranking_reward`, `coupon_exchange`, `coupon_refund`, `admin`, **`checkin`**（2026-05-06追加）

### fee_transactions（手数料台帳）
```sql
id, amount(signed), source, memo,
related_user_id, related_chip_tx_id, created_by, created_at
```
source: `transfer_fee` | `rake` | `manual_add` | `manual_subtract`

### audit_logs（操作ログ）★ マスター閲覧用
```sql
id, action, category, summary, target_type, target_id, target_label,
details(jsonb), actor_id, actor_name, ip_address, user_agent, created_at
```

### その他
- `ranks` — ランク定義（ブロンズ〜プラチナ）
- `visits` — 来店記録（UNIQUE制約で当日二重チェックイン防止）
- `coupon_templates` — クーポン雛形（image_url, subtitle, notice 追加済）
- `coupons` — 発行済みクーポン
- `notices` — お知らせ
- `qr_tokens` — QR用ワンタイムトークン

完全な初期スキーマは `docs/db-schema-fixed.sql`、追加変更は `docs/migrations/` を時系列で参照。

---

## 7. 実装済み機能一覧

### 🍷 ユーザー側

| 機能 | 場所 | 備考 |
|------|------|------|
| 新規登録（メール＋PW＋生年月日＋性別） | `/signup` | |
| ログイン | `/login` | LINE LIFF自動ログイン対応 |
| ホーム画面 | `/home` | チップカード、メニュー、今お店にいる人、本日ランキング |
| QR表示（送金用） | `/qr` | 受け取り用QR |
| QRスキャン | `/qr` | チェックイン or 送金 |
| チェックイン | `/api/checkin` | **位置情報検証**（半径100m）、500chip+10pt付与 |
| チップ送付 | `/transfer/[token]` | **10%手数料**徴収、手数料は fee_transactions に記録 |
| 履歴 | `/history?tab=chip\|point` | 折れ線グラフ + 一覧 |
| ランキング | `/ranking?tab=...` | **10種類**（チップ/来店/送受 3カテゴリ） |
| クーポン | `/coupons` | リスト→詳細→二重確認→「スタッフに提示」 |
| お知らせ | `/notices` | 未読バッジ |
| プロフィール編集 | `/menu/profile` | アバター・自己紹介 |
| 他人プロフィール | `/profile/[id]` | ランキングからタップで遷移 |
| 予約ボタン | ChipCard内 | 外部 ebica URL を新規タブで開く |

### 🛠️ 管理画面

| 機能 | 場所 | 権限 |
|------|------|------|
| 管理者ログイン | `/admin-login` | — |
| スタッフ管理 | `/admin/staff` | マスターのみ |
| 顧客一覧・検索 | `/admin/customers` | 全員 |
| 顧客詳細 | `/admin/customers/[id]` | 全員（顧客削除はマスターのみ） |
| チェックイン状況 | `/admin/checkins` | 全員（リアルタイム、生年月日表示） |
| 取引履歴 | `/admin/transactions` | 全員（日付ナビ＋JST表示） |
| 管理チップ残高 | `/admin/fees` | 全員（減算・レーキはマスターのみ） |
| ランキング履歴 | `/admin/rankings` | 全員（日/月/年/来店/保有） |
| レポート | `/admin/reports` | 全員（KPI＋日別チャート） |
| 操作ログ | `/admin/audit-logs` | マスターのみ |
| QRスキャン | `/admin/scan` | 全員 |
| 店舗QR | `/admin/store-qr` | 全員 |
| クーポン雛形 | `/admin/coupons/templates` | マスターのみ（編集・削除・公開切替） |
| クーポン対象発行 | `/admin/coupons/issue` | マスターのみ（**セグメント検索**で一括配布） |
| クーポン消込 | `/admin/coupons/redeem` | 全員 |
| お知らせ | `/admin/notices` | 全員 |
| ポーカー管理 | サイドバー → 外部 | SSO引き継ぎ（URL fragment 経由） |

### 権限マトリクス

| 操作 | スタッフ | マスター |
|------|---------|---------|
| チェックイン確認 | ✅ | ✅ |
| 顧客のチップ操作 | ✅ | ✅ |
| 顧客のポイント操作 | ❌ | ✅ |
| 顧客削除 | ❌ | ✅ |
| 手数料 追加 | ✅ | ✅ |
| 手数料 減算 | ❌ | ✅ |
| ポーカーレーキ | ❌ | ✅ |
| クーポン発行 | ❌ | ✅ |
| クーポン雛形管理 | ❌ | ✅ |
| スタッフPW参照 | ❌ | ✅ |
| 自分のPW変更 | ✅ | ✅ |
| 操作ログ閲覧 | ❌ | ✅ |

---

## 8. 重要な共通ロジック・規約

### 営業日（`lib/utils/businessDay.ts`）
- 06:00 JST 開始 → 翌05:59 JST 終了
- 計算式: `Math.floor((now + 3h) / 86400s) * 86400s - 3h`
- すべての「日次」集計はこれを基準にする

### チップ増減（`lib/utils/chipDelta.ts`）★ 必読
**ユーザー側と管理側のランキングが一致しない問題を解消**するため、チップ増減計算を一本化した関数。

```typescript
chipDeltaForUser(tx, userId): number
netChangeByUser(txs): Record<userId, netDelta>
```

- ランキング・残高再計算・履歴グラフ等、**チップ増減を扱う箇所はすべてこの関数を使う**
- 期間内の `chip_transactions` 全行を対象に、各ユーザーへの符号付き影響量を合計する

### GDP の定義
> **GDP = 期間内のユーザー間トランスファーで移動したチップ総量**
> = `sum(amount) WHERE type='transfer' AND to_user_id IS NOT NULL`

レポート・チェックイン画面・ランキング画面の「GDP」「チップ流動」表記はすべてこの定義で統一。

### 位置情報検証（`lib/utils/geo.ts`）
- Haversine 公式で距離計算
- `STORE_LAT` / `STORE_LNG` / `STORE_RADIUS_M` 未設定なら検証スキップ
- GPS 精度が 200m を超える場合も拒否

### 監査ログ（`lib/admin/audit.ts`）
`recordAudit({...})` で記録。actor_id/ip/UA は自動。エラーは握りつぶす（業務処理を阻害しない）。

### Supabase クライアントの使い分け
| 用途 | クライアント |
|------|------------|
| Server Component（認証済み） | `createClient` from `@/lib/supabase/server` |
| Server: 自分以外のデータ参照、書き込み | `createAdminClient` from `@/lib/supabase/admin` |
| Client Component | `createClient` from `@/lib/supabase/client` |

**注意**: ユーザー自身のデータ取得も `adminClient` を使う場面が多い（RLS の事故防止）。

---

## 9. 重要な事故対応・落とし穴

### ⚠️ 顧客と管理アカウントは同じ `auth.users` を使うが、混在しない
- 顧客は `public.users` にもレコードあり
- 管理アカウントは `public.admin_users` にのみあり（合成メール `xxx@admin.local`）
- スタッフ作成時、トリガーで `public.users` にも行が作られるので **即座に削除している**（`/api/admin/staff/cleanup`）

### ⚠️ ポーカーシステムが共有テーブルを使う
- `chip_transactions` に独自タイプ `seat_out`, `withdraw` を投入
- 型制約 (`chip_transactions_type_check`) を変更する際は **必ずポーカー側の型も含める**
- ポーカー側は `chip_balance` を直接 UPDATE することがある（トリガーに依存しない）

### ⚠️ 顧客削除時の chip_transactions FK
- `from_user_id` / `to_user_id` は **CASCADE ではなく SET NULL** で運用
- 顧客削除時、削除前に NULL に置換してから DELETE

### ⚠️ チップ残高がずれた場合
`/api/admin/chip-recalc` (POST、マスター限定) で全ユーザー再計算が可能。スタッフ管理画面に「残高再計算」ボタンあり。

### ⚠️ Next.js Turbopack の `pages-manifest.json` エラー
ローカルビルドで稀に発生:
```bash
rm -rf .next node_modules/.cache && pnpm build
```
Vercel上では発生しないため、直接デプロイで回避可能。

### ⚠️ `vercel env pull` で値が空に見える
Vercel CLI は encrypted env vars を `""` で返す仕様。実際は本番では正しく読み込まれる。

### ⚠️ PWA / iOS standalone で `window.open(_blank)` がブロックされる
ポーカー管理リンク等の外部遷移は `isStandalone` を検出して `window.location.href` にフォールバックしている（`AdminSidebar.tsx`）。

---

## 10. 未着手・これからやること

### 🚧 LINE LIFF 連携の完成
**基盤実装済み・設定待ち**
- [x] `@line/liff` 導入
- [x] `/api/auth/line` でセッション発行
- [x] ログインページに LINE ボタン
- [ ] **LINE Developers Console で LIFF ID を取得 → 環境変数登録**
- [ ] 公式LINEのリッチメニュー設定
- [ ] LIFF経由ユーザーと既存ユーザーの紐付け（メアド一致時マージ等）

### 🎨 デザイン強化（「もっと遊びを感じる」要件）
- [ ] 生年月日のお祝いバナー（誕生月に何か特典）
- [ ] **連続来店ストリーク** カウンター
- [ ] **称号バッジ**（初来店・10回・100回など）
- [ ] チェックイン時の派手なアニメーション
- [ ] ランキングのトロフィー演出強化
- [ ] **ホーム画面の見た目を更にリッチに**
- [ ] 通知 / プッシュ（要 PWA + Service Worker 整備）

### 🃏 ポーカーシステム連携の深化
- [x] SSO（URL fragmentでセッション引き渡し）
- [x] チップ残高共有
- [ ] ポーカー卓のリアルタイム参加状況をこちらに反映？
- [ ] ポーカートーナメント結果のお知らせ自動投稿？

### 📱 PWA / オフライン対応
- [ ] manifest.json の整備（一部実装済か要確認）
- [ ] Service Worker
- [ ] iOS のホーム画面追加時の動作テスト

### 🔐 セキュリティ・保守
- [ ] **`admin_users.password_plain` の暗号化**（現在は要件に従い平文保存だが将来的に対称暗号化推奨）
- [ ] RLS ポリシーの整理（現状ほぼ未設定。service role key 経由のサーバー処理に依存している）
- [ ] レート制限の追加（チェックイン、送金等）
- [ ] 監視・アラート（Vercel + Supabase の組み合わせで何を入れるか検討）

### 📊 分析
- [ ] レポートに **顧客リピート率** や **コホート分析** を追加
- [ ] CSV エクスポート機能（顧客一覧・取引履歴）

### 🧪 テスト・CI
- [ ] テストコード 0 件 → ユニットテスト追加（`lib/utils/chipDelta.ts` から優先）
- [ ] CI（GitHub Actions など）導入

### 🧹 リファクタ候補
- [ ] `/menu/chip-history` `/menu/point-history` は使われていない（`/history` に統合済み）→ 削除可
- [ ] `app/(admin)/admin/chips/` が存在するか確認・整理
- [ ] `database.ts` の型をSupabase CLIで自動生成に切り替え検討
- [ ] `AdminChipOp` のスタッフ向けバリデーション（過大な減算等）

---

## 11. マイグレーション履歴

`docs/migrations/` 配下に時系列で配置。**新しいDB変更は必ずここにSQLファイルを追加する**。

| 日付 | ファイル | 内容 |
|------|---------|------|
| 2026-04-27 | `admin_name.sql` | `admin_users.name` 追加 |
| 2026-04-28 | `fix_chip_trigger_and_balance.sql` | チップトリガー修正＋全残高再計算 |
| 2026-04-28 | `user_profile_fields.sql` | `users.birthday` / `gender` 追加 |
| 2026-04-30 | `avatar_url.sql` | `users.avatar_url` 追加 |
| 2026-05-01 | `fee_transactions.sql` | `fee_transactions` テーブル、`fee` type 追加 |
| 2026-05-02 | `audit_logs.sql` | `audit_logs` テーブル |
| 2026-05-02 | `coupon_v2.sql` | `coupon_templates.subtitle/image_url/notice` 追加 |
| 2026-05-03 | `staff_password_view.sql` | `admin_users.password_plain` 追加 |
| 2026-05-06 | `checkin_point.sql` | `point_transactions` に `checkin` type 許可 |

### 新規マイグレーションの作り方
1. `docs/migrations/YYYY-MM-DD_<name>.sql` を作成
2. SQLを書く（`if exists` / `if not exists` を活用しイドempotentに）
3. Supabase SQL Editor で実行
4. コードを更新（TypeScript型・APIロジック）
5. デプロイ

---

## 12. よくある作業手順

### A. ローカル開発開始
```bash
cd /Users/hoshiseiju/Desktop/es-app
pnpm install
cp .env.local.example .env.local   # 既存があれば不要
pnpm dev
# → http://localhost:3000
```

### B. 本番デプロイ
```bash
pnpm build && vercel --prod --yes
```
失敗時は `rm -rf .next && pnpm build` でキャッシュクリア → 再デプロイ。

### C. Vercel プロジェクトリンク確認
```bash
vercel project ls
# es-app が正しいプロジェクト
# .vercel/project.json で確認可能
# 違うプロジェクトに紐づいた場合: rm -rf .vercel && vercel link --yes --project=es-app
```

### D. DBマイグレーション実行
1. `docs/migrations/` に新しい SQL を追加
2. Supabase ダッシュボード → SQL Editor で実行
3. `lib/types/database.ts` を手動で更新
4. デプロイ

### E. データ確認スクリプト（service_role key 利用）
```bash
# .env.local の URL/SERVICE_ROLE_KEY を使う
# (一時ファイルを置いて削除する流れ)
```
過去事例: `_temp_check.mjs` 等を一時的に作成して @supabase/supabase-js で叩いている。

---

## 13. ユーザー要件のヒストリー

主要な仕様変更:

1. **会員登録**: 生年月日・性別必須 → 入力フォーム追加
2. **チェックイン**: 位置情報検証 → 半径100m以内のみ許可 → ポイント+10pt付与追加
3. **送金**: 10% 手数料追加 → 手数料台帳に集計
4. **管理アカウント**: ユーザーと完全分離 → 合成メール `xxx@admin.local`
5. **マスター/スタッフ権限**: 細かい権限制御
6. **クーポン**: 雛形（画像・サブタイトル・注意事項）+ セグメント配信
7. **ランキング**: 10種類（チップ/来店/送受3カテゴリ）、`chipDeltaForUser` で一本化
8. **GDP**: 「ユーザー間トランスファーのみ」と定義
9. **操作ログ**: マスター閲覧の audit_logs
10. **ポーカー連携**: SSO（URL fragment）+ chip_transactions 共有
11. **LINE 連携**: LIFF 自動ログイン（設定待ち）

---

## 14. 連絡先・参考

### ドキュメント
- 業務ルール: `docs/business-rules.md`
- 画面仕様: `docs/screens.md`
- 要件: `docs/requirements.md`
- 初期スキーマ: `docs/db-schema-fixed.sql`

### 外部サービス
- Vercel: https://vercel.com/ltinfluence1023-2940s-projects
- Supabase: https://supabase.com/dashboard/project/vjteercfticstkrueajc
- LINE Developers（要設定）: https://developers.line.biz/

### 開発の進め方の引き継ぎノウハウ
- **共有テーブルへの変更は2システム両方の影響確認が必須**
- **チップ残高は `chip_transactions` を Source of Truth** とし、`users.chip_balance` はビュー的扱い（ズレたら再計算）
- **環境変数は Vercel ダッシュボード**で管理。`vercel env pull` で `""` が出るのは仕様
- 仕様追加時は **必ず `lib/types/database.ts` を更新** しないと型エラーになる
- マスター/スタッフの権限分岐は `lib/admin/auth.ts` の `isMaster()` / `isAdmin()` を使う

### 最終デプロイ確認チェックリスト
- [ ] `pnpm build` が通る
- [ ] 必要なマイグレーションが Supabase で実行済み
- [ ] Vercel 環境変数が正しい
- [ ] `vercel --prod --yes` の出力に `Aliased: https://es-app-livid.vercel.app` が含まれる
- [ ] 実機でハードリロード → 動作確認

---

引き継ぎ担当者の方、何か不明点があればコードコメント・コミットメッセージ・本ドキュメントの **ヒストリー (`docs/prompts.md`)** を参照してください。仕様の決定経緯はそこに残っています。
