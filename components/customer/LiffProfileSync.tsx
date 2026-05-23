"use client";

import { useEffect } from "react";
import { initLiff } from "@/lib/liff/client";

/**
 * LIFF 内で開いたとき、バックグラウンドで LINE プロフィールを同期する。
 * レンダリングには何も出力しない（null を返す）。
 *
 * 配置場所: 顧客レイアウト（全ページで動作させるため）
 * 目的: middleware が /login → /home にリダイレクトするケースでも
 *       nickname / avatar_url / line_user_id を常に最新に保つ。
 */
export function LiffProfileSync() {
  useEffect(() => {
    (async () => {
      const liff = await initLiff();
      if (!liff?.isLoggedIn()) return;

      const accessToken = liff.getAccessToken();
      if (!accessToken) return;

      const profile = await liff.getProfile().catch(() => null);
      if (!profile) return;

      // fire-and-forget — エラーは無視（UX に影響しない）
      fetch("/api/auth/line/sync", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          accessToken,
          displayName: profile.displayName,
          pictureUrl:  profile.pictureUrl ?? "",
        }),
      }).catch(() => {});
    })();
  }, []); // マウント時に1回だけ実行

  return null;
}
