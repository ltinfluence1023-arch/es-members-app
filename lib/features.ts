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
  /** アチーブメント: ミッション一覧・達成時のチップ付与・ホームの達成度表示・管理画面のアチーブメント */
  achievements: false,
  /**
   * お知らせ公開時の LINE 一斉通知（line_user_id を持つ全員へ multicast）。
   * 通数＝費用のため既定はオフ。必要なときだけ true にしてデプロイする。
   */
  lineNoticePush: false,
} as const;

export const FEATURE_DISABLED_MESSAGE = "この機能は現在ご利用いただけません";
