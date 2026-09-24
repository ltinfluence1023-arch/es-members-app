# Claude Code 定型プロンプト集

VS Code の Claude Code 拡張で使う「コピペ用プロンプト」集。
すべて前提として `/CLAUDE.md` と `/docs/requirements.md` の参照が含まれる前提です。

---

## 0. 共通の前置き（毎回頭に付ける）

> `/CLAUDE.md`, `/docs/requirements.md`, `/docs/business-rules.md`, `/docs/screens.md` を読んでから作業してください。
> 実装前にファイル一覧と変更計画を提示し、私の承認を得てから実装してください。
> 業務ルール番号 (R-xxx) を実装コメントに残してください。

---

## 1. プロジェクト初期構築

> 共通前置きを参照。
> Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Supabase でプロジェクトを初期化してください。
> パッケージマネージャは pnpm。
> ディレクトリ構成は `/CLAUDE.md` の規約に厳密に従ってください。
> Supabase クライアントは `/lib/supabase/client.ts` (ブラウザ用) と `/lib/supabase/server.ts` (サーバー用) と `/lib/supabase/admin.ts` (service_role用) の3種を用意してください。
> 完成したらセットアップ手順を README にまとめてください。

---

## 2. DB 適用

> `/docs/db-schema.sql` を Supabase に適用する手順を README に追記してください。
> Supabase CLI でローカルマイグレーション化する手順も提案してください。
> 適用後、ranks テーブルに初期データが入っていることを確認するクエリも書いてください。

---

## 3. 認証実装

> 共通前置きを参照。R-701〜R-705 に従い、顧客用と管理者用の認証を分離して実装してください。
> Supabase Auth でメール/電話番号ログインに対応。
> Next.js のミドルウェアでルート単位の権限チェックを行ってください。
> `/(customer)/*` は認証済顧客のみ、`/(admin)/*` は admin_users 登録者のみ。
> 未認証時は `/login` へリダイレクト。

---

## 4. 共通レイアウト（ボトムナビ + ハンバーガー）

> `/docs/screens.md` §1 を参照。
> `/(customer)/layout.tsx` に以下を実装してください:
> - 上部: 店舗名 + 右上ハンバーガーアイコン
> - 下部固定: 4タブのボトムナビ (ホーム / ランキング / クーポン / お知らせ)
> - ハンバーガーメニュー展開時はオーバーレイ + 右からスライドイン
> shadcn/ui の Sheet コンポーネントを使ってください。
> アクティブタブはアイコン色を変えて表示。

---

## 5. 会員トップ `/home`

> `/docs/screens.md` §2.1 を参照。
> サーバーコンポーネントで以下を取得し表示:
> - users.chip_balance, users.point_balance
> - users.rank_id 経由で ranks.name
> - マイQRトークン (`/api/qr/generate` を呼んで qr_tokens に挿入、5分有効、R-801〜R-803)
> - QR画像は `qrcode` ライブラリでクライアント側生成
> - 残り時間カウントダウンと「更新」ボタン
> 「QRを読み取る」ボタンで `/scan` へ遷移。

---

## 6. QR 読取 `/scan`

> `/docs/screens.md` §2.2 を参照。
> `html5-qrcode` でカメラ起動。
> 読み取った文字列を JSON.parse し、`type` フィールドで分岐:
> - `store_checkin` → `/api/checkin` POST
> - `user_receive` → `/transfer/[token]` へ遷移
> エラー時は日本語でわかりやすく表示。
> カメラ権限拒否時のフォールバックも用意。

---

## 7. チェックイン API `/api/checkin`

> R-201〜R-206 に従い実装。
> POST `/api/checkin` { storeId } を受けて:
> 1. 認証ユーザー取得
> 2. 当日 (Asia/Tokyo) チェックイン済みチェック
> 3. visits 挿入 (一意制約で二重防止)
> 4. ranks から checkin_bonus 取得
> 5. chip_transactions に type='checkin' で挿入
> すべて単一トランザクション。失敗時は適切なエラーメッセージ。

---

## 8. マイQR + 送金 `/transfer/[token]`

> R-301〜R-306 に従い実装。
> サーバー側で qr_tokens を検証 (期限・使用済みチェック)。
> POST `/api/transfer` { token, amount } で:
> 1. SELECT FOR UPDATE で送信者残高ロック
> 2. 自己送金チェック (R-301)
> 3. 残高チェック (R-002)
> 4. chip_transactions に type='transfer' で挿入
> 5. qr_tokens.used_at 更新 (R-803)
> すべて単一トランザクション。

---

## 9. ランキング `/ranking`

> `/docs/screens.md` §2.4 を参照。
> 4タブで以下を集計:
> - 月間チップ増減: chip_transactions の当月合計 (group by user)
> - 年間チップ増減: 当年合計
> - 年間来店回数: visits の当年件数
> - 総保有チップ: users.chip_balance 降順
> Top 50 まで。
> 自分の順位は下部固定。
> ニックネームのみ表示 (R-601)。
> サーバーコンポーネントで集計し、Recharts は使わない (テキストランキングのみ)。

---

## 10. クーポン一覧 `/coupons`

> `/docs/screens.md` §2.5 を参照。
> 3タブ (未使用/使用済/期限切れ) で coupons を表示。
> 振り分けロジック:
> - 未使用: used_at IS NULL AND expires_at > now()
> - 使用済: used_at IS NOT NULL
> - 期限切れ: used_at IS NULL AND expires_at <= now()
> 各カードに「詳細」ボタン → `/coupons/[id]`。
> ページ末尾に「ポイントで交換する」ボタン → `/coupons/exchange`。

---

## 11. クーポン使用フロー

> R-501〜R-511 に従い実装。
> `/coupons/[id]` で「使用する」確認モーダル。
> 「はい」で `/api/coupons/[id]/reserve` POST:
> 1. coupons.reserved_at = now() を SELECT FOR UPDATE で設定
> 2. 既に reserved_at が 2 分以内に設定されていれば失敗
> 3. 6桁 reserved_code をランダム生成
> 4. 提示画面 `/coupons/[id]/redeem` へ遷移
> 提示画面では 6 桁コード + QR を表示し、2 分カウントダウン。
> 管理者の消込 API (`/api/admin/coupons/redeem`) で used_at を確定。

---

## 12. ポイント交換 `/coupons/exchange`

> `/docs/screens.md` §2.8 を参照。
> R-508, R-509 に従う。
> coupon_templates の point_cost IS NOT NULL かつ is_active=true を一覧表示。
> 「交換する」ボタン → 確認モーダル → `/api/coupons/exchange` POST。
> サーバー側は DB の `exchange_point_for_coupon` RPC を呼ぶ (db-schema.sql 参照)。
> 成功したらクーポン一覧に戻り、トースト表示。

---

## 13. お知らせ `/notices`

> 公開済 notices を新着順に表示。
> 詳細画面 `/notices/[id]` で本文・画像表示。
> 管理画面で公開設定。

---

## 14. ハンバーガーメニュー配下

> 以下を順に実装:
> - `/menu/profile`: ニックネーム編集、連絡先マスク表示、ログアウト
> - `/menu/chip-history`: chip_transactions を無限スクロール
> - `/menu/point-history`: point_transactions を無限スクロール
> - `/menu/rank`: 現在ランクと次ランクまでの進捗バー
> - `/menu/terms`: 静的MDX
> - `/menu/privacy`: 静的MDX

---

## 15. 管理画面: 顧客一覧・詳細

> R-702 を参照。
> `/admin/customers` でニックネーム・連絡先検索可能な一覧。
> 各行に chip_balance, point_balance, total_visit_count を表示。
> `/admin/customers/[id]` で詳細 + 履歴2種 + 操作ボタン。

---

## 16. 管理画面: チップ・ポイント操作

> R-401〜R-406 に従い実装。
> モーダルで「金額・種別・理由」を入力。
> 理由は必須 (zod でバリデーション)。
> チップ操作とポイント操作はモーダルを分け、関数も分離 (`addChip` / `addPoint`)。

---

## 17. 管理画面: クーポン管理

> 3画面構成:
> - `/admin/coupons/templates`: 雛形 CRUD
> - `/admin/coupons/issue`: 個別 or 一斉発行
> - `/admin/coupons/redeem`: 顧客提示の 6 桁コードを入力して消込
> 消込時は coupons.reserved_code で検索し、used_at と used_by を更新。

---

## 18. 管理画面: お知らせ管理

> CRUD 一覧。is_published, published_at を切替。画像アップロードは Supabase Storage。

---

## 19. テスト作成

> `/docs/business-rules.md` 末尾の「テスト必須ケース」全項目を網羅するテストを作成してください。
> Vitest + Supabase ローカル DB。
> 並行送金テストは Promise.all で同時リクエスト発火。
> クーポン二重使用テストも忘れずに。

---

## 20. デプロイ準備

> Vercel デプロイ用設定。
> 環境変数一覧 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STORE_QR_SECRET` など) を README にまとめる。
> 本番 Supabase 接続手順、初回管理者の作成手順 (auth.users と admin_users 両方への INSERT) も明記。
> `/docs/requirements.md` §9 のチェックリストを README にコピー。

---

## 使い方のコツ

- **1回に1機能だけ依頼する**。複数同時依頼は精度が落ちる。
- **業務ルール番号 (R-101 など) を引用する**と精度が上がる。
- **承認前に勝手に実装したら止める**。「計画だけ先に」と再依頼。
- **失敗したら git で戻す**。Claude Code の自動コミット設定を活用。
- **チップとポイントを混同していないか毎回確認**。
