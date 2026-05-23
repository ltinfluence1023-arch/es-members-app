"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { initLiff } from "@/lib/liff/client";
import { Loader2, MessageCircle } from "lucide-react";

/**
 * LINE LIFF 自動ログイン
 *
 * - LIFF 未設定 → 何も表示しない
 * - isLoggedIn() = true → accessToken を使って自動ログイン（ボタン不要）
 * - 未ログイン → 「LINEでログイン」ボタンを表示し liff.login() を呼ぶ
 * - needsBirthday = true → /onboarding へリダイレクト（初回登録フロー）
 *
 * NOTE: idToken は openid scope 必須で通常 null になるため accessToken を使用。
 */
export function LineAutoLogin() {
  const router = useRouter();
  const [enabled,    setEnabled]    = useState(false);
  const [autoTrying, setAutoTrying] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const doLogin = useCallback(async () => {
    setError(null);
    setAutoTrying(true);

    try {
      const liff = await initLiff();
      if (!liff) throw new Error("LIFF が初期化されていません");

      // 未ログインなら LINE 認証画面へ（その後このページに戻る）
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href });
        return;
      }

      const accessToken = liff.getAccessToken();
      if (!accessToken) throw new Error("アクセストークン取得失敗");

      const profile = await liff.getProfile();

      const res = await fetch("/api/auth/line", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          accessToken,
          displayName: profile.displayName,
          pictureUrl:  profile.pictureUrl ?? "",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "ログイン失敗");

      // 初回登録（誕生日未設定）→ オンボーディングへ
      if (data.needsBirthday) {
        router.push("/onboarding");
      } else {
        router.push("/home");
      }
      router.refresh();

    } catch (e) {
      setError(e instanceof Error ? e.message : "ログイン中にエラーが発生しました");
      setAutoTrying(false);
    }
  }, [router]);

  // マウント時: LIFF 初期化 → ログイン済みなら自動ログイン
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const liff = await initLiff();
      if (cancelled || !liff) return;
      setEnabled(true);

      if (liff.isLoggedIn()) {
        doLogin();
      }
    })();
    return () => { cancelled = true; };
  }, [doLogin]);

  // ── 描画 ──────────────────────────────────────────────────────────────────

  if (!enabled) return null;

  if (autoTrying) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <Loader2 size={28} className="animate-spin" style={{ color: "#06C755" }} />
        <p className="text-sm font-medium" style={{ color: "#06C755" }}>
          LINEアカウントで自動ログイン中...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={doLogin}
        className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3.5 text-sm font-bold text-white interactive"
        style={{ background: "#06C755", boxShadow: "0 0 18px rgba(6,199,85,0.40)" }}
      >
        <MessageCircle size={20} />
        LINEでログイン・登録
      </button>
      {error && (
        <p className="text-xs text-destructive text-center px-2">{error}</p>
      )}
    </div>
  );
}
