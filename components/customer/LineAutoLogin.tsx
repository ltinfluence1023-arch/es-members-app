"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initLiff, lineLogin } from "@/lib/liff/client";
import { MessageCircle, Loader2 } from "lucide-react";

/**
 * LINE 自動ログイン:
 * - LIFF が未設定なら何も表示しない
 * - isLoggedIn() が true なら自動でトークンを送信してログイン
 *   （LINE アプリ内ブラウザ・通常ブラウザのリダイレクト後どちらも対応）
 * - ログイン前なら「LINEでログイン」ボタンを表示
 */
export function LineAutoLogin() {
  const router = useRouter();
  const [enabled,    setEnabled]    = useState(false);
  const [autoTrying, setAutoTrying] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const liff = await initLiff();
      if (cancelled || !liff) return;
      setEnabled(true);

      // LINE アプリ内・通常ブラウザのリダイレクト後どちらも isLoggedIn() で判定
      if (liff.isLoggedIn()) {
        setAutoTrying(true);
        try {
          const idToken = liff.getIDToken();
          if (!idToken) { setAutoTrying(false); return; }
          const profile = await liff.getProfile();
          const res = await fetch("/api/auth/line", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              idToken,
              displayName: profile.displayName,
              pictureUrl:  profile.pictureUrl,
            }),
          });
          if (res.ok) {
            router.push("/home");
            router.refresh();
          } else {
            const data = await res.json().catch(() => ({}));
            setError(data.error ?? "LINEログイン失敗");
            setAutoTrying(false);
          }
        } catch {
          setAutoTrying(false);
        }
      }
    }
    run();

    return () => { cancelled = true; };
  }, [router]);

  async function handleManualLogin() {
    setError(null);
    try {
      await lineLogin();
    } catch (e) {
      setError(e instanceof Error ? e.message : "LIFFが初期化されていません");
    }
  }

  if (!enabled) return null;

  if (autoTrying) {
    return (
      <div className="flex items-center justify-center gap-2 py-3 text-sm"
        style={{ color: "#06C755" }}>
        <Loader2 size={16} className="animate-spin" />
        LINEログイン中...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleManualLogin}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white interactive"
        style={{ background: "#06C755", boxShadow: "0 0 14px rgba(6,199,85,0.35)" }}
      >
        <MessageCircle size={18} />
        LINEでログイン
      </button>
      {error && <p className="text-xs text-destructive text-center">{error}</p>}
    </div>
  );
}
