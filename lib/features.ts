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
  /**
   * お客様自身の来店チェックイン（店舗QR＋GPS・チップ付与）と来店ランキング。
   * 店内で GPS がずれる・位置情報を断る人が出るため停止（2026-10-30）。店舗QRは固定文字列なので GPS だけ外すのは不可
   */
  checkin: false,
  /** デイリークイズ（正解でチップ付与）。管理画面での問題登録は使える */
  quiz: false,
  /** ブラックジャック（チップで対戦）と BJ ランキング */
  blackjack: false,
  /**
   * チップ付与・順位上昇・引き継ぎ承認の LINE 個別通知（push）。
   * 通数＝費用、かつ送り先の公式アカウントと LINE ログインのプロバイダーが揃うまで既定はオフ。
   */
  lineChipPush: false,
} as const;

export const FEATURE_DISABLED_MESSAGE = "この機能は現在ご利用いただけません";
