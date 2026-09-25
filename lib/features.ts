/**
 * 機能の公開設定。
 * false の機能は顧客画面から隠し、関連 API も停止する（コード・DB・過去データは残す）。
 * 再公開するときは true に戻してデプロイするだけでよい。
 */
export const FEATURES = {
  /** 顧客間のチップ送金（QR転送・送受ランキング・送金アチーブメント） */
  transfer: false,
  /** ポイント（pt）: 残高表示・ポイント履歴・クーポン交換・チェックイン時の付与・管理画面のポイント操作 */
  points: false,
} as const;

export const FEATURE_DISABLED_MESSAGE = "この機能は現在ご利用いただけません";
