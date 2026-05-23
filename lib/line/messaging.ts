/**
 * LINE Messaging API ユーティリティ
 *
 * 前提:
 *   - LINE_MESSAGING_API_TOKEN が設定されていない場合は静かにスキップ
 *   - push: 1 ユーザーに送信（要フォロー）
 *   - multicast: 最大 500 ユーザーに一括送信
 */

const BASE = "https://api.line.me/v2/bot";

function liffUrl(path = "") {
  const id = process.env.NEXT_PUBLIC_LIFF_ID;
  return id ? `https://liff.line.me/${id}${path}` : "https://es-app-livid.vercel.app";
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.LINE_MESSAGING_API_TOKEN}`,
  };
}

export interface LineTextMessage {
  type: "text";
  text: string;
}

/** 1 ユーザーへ push 送信 */
export async function sendPush(lineUserId: string, text: string): Promise<void> {
  if (!process.env.LINE_MESSAGING_API_TOKEN) return;
  try {
    await fetch(`${BASE}/message/push`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: "text", text }] satisfies LineTextMessage[],
      }),
    });
  } catch (err) {
    console.error("[LINE push]", err);
  }
}

/** 複数ユーザーへ multicast 送信（500件ずつ分割） */
export async function multicast(lineUserIds: string[], text: string): Promise<void> {
  if (!process.env.LINE_MESSAGING_API_TOKEN || lineUserIds.length === 0) return;
  try {
    for (let i = 0; i < lineUserIds.length; i += 500) {
      const chunk = lineUserIds.slice(i, i + 500);
      await fetch(`${BASE}/message/multicast`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          to: chunk,
          messages: [{ type: "text", text }] satisfies LineTextMessage[],
        }),
      });
    }
  } catch (err) {
    console.error("[LINE multicast]", err);
  }
}

// ─── 通知メッセージ生成 ──────────────────────────────────────────────────────

/** チップ付与・増減通知 */
export function chipNoticeText(amount: number, newBalance: number, memo?: string): string {
  const sign   = amount > 0 ? "+" : "";
  const action = amount > 0 ? "付与" : "変動";
  return [
    `💎 チップ${action}のお知らせ`,
    "",
    `${sign}${amount.toLocaleString()} chip`,
    `現在残高: ${newBalance.toLocaleString()} chip`,
    ...(memo ? [`\n📝 ${memo}`] : []),
    "",
    `👉 アプリで確認\n${liffUrl()}`,
  ].join("\n");
}

/** ランキング上昇通知 */
export function rankingUpText(prevRank: number, newRank: number): string {
  return [
    `🏆 ランキング上昇！`,
    "",
    `${prevRank}位 → ${newRank}位 になりました✨`,
    "",
    `👉 ランキングを確認\n${liffUrl()}`,
  ].join("\n");
}

/** お知らせ公開通知 */
export function noticeText(title: string): string {
  return [
    `📢 新しいお知らせ`,
    "",
    `「${title}」`,
    "",
    `詳細はアプリでご確認ください\n👉 ${liffUrl()}`,
  ].join("\n");
}
