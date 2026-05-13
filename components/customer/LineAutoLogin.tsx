"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initLiff, lineLogin } from "@/lib/liff/client";
import { MessageCircle } from "lucide-react";

/**
 * LINE 自動ログイン:
 * - LIFFが構成されていなければ何も表示しない
 * - LIFFブラウザで開いていれば自動的にトークンをサーバーに送信してログイン
 * - 通常ブラウザでも「LINEでログイン」ボタンを表示
 */
export function LineAutoLogin() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [autoTrying, setAutoTrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const liff = await initLiff();
      if (cancelled || !liff) return;
      setEnabled(true);

      // If running inside LINE and already logged into LINE, auto-complete login
      if (liff.isInClient() && liff.isLoggedIn()) {
        setAutoTrying(true);
        try {
          const profile = await liff.getProfile();
          const idToken = liff.getIDToken();
          if (!idToken) return;
          const res = await fetch("/api/auth/line", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              idToken,
              displayName: profile.displayName,
              pictureUrl: profile.pictureUrl,
            }),
          });
          if (res.ok) {
            router.push("/home");
            router.refresh();
          } else {
            const data = await res.json().catch(() => ({}));
            setError(data.error ?? "LINEログイン失敗");
          }
        } finally {
          setAutoTrying(false);
        }
      }
    }
    run();

    return () => { cancelled = true; };
  }, [router]);

  async function handleManualLogin() {
    try {
      await lineLogin();
    } catch (e) {
      setError(e instanceof Error ? e.message : "LIFFが初期化されていません");
    }
  }

  if (!enabled) return null;

  return (
    <div className="space-y-2">
      <button
        onClick={handleManualLogin}
        disabled={autoTrying}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white interactive disabled:opacity-50"
        style={{ background: "#06C755", boxShadow: "0 0 14px rgba(6,199,85,0.35)" }}
      >
        <MessageCircle size={18} />
        {autoTrying ? "LINEログイン中..." : "LINEでログイン"}
      </button>
      {error && <p className="text-xs text-destructive text-center">{error}</p>}
    </div>
  );
}
