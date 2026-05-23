"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Loader2, CheckCircle2 } from "lucide-react";

interface Props {
  nickname: string;
  avatarUrl: string | null;
}

export function OnboardingForm({ nickname, avatarUrl }: Props) {
  const router  = useRouter();
  const [birthday, setBirthday] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [done,     setDone]     = useState(false);

  // 最大日付: 20年前まで（20歳以上）
  const maxDate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 20);
    return d.toISOString().split("T")[0];
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!birthday) { setError("生年月日を選択してください"); return; }
    setLoading(true);
    setError(null);

    const res  = await fetch("/api/onboarding", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ birthday }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "登録に失敗しました");
      setLoading(false);
      return;
    }

    setDone(true);
    setTimeout(() => {
      router.push("/home");
      router.refresh();
    }, 1200);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-page-in">

        {/* ── ブランド ── */}
        <div className="mb-8 text-center">
          <p className="text-[10px] font-bold tracking-[0.4em] uppercase text-muted-foreground mb-2">
            members
          </p>
          <h1 className="text-2xl font-black tracking-[0.12em] lowercase"
            style={{ color: "var(--primary)" }}>
            flair bar es
          </h1>
        </div>

        {/* ── アバター + 名前 ── */}
        <div className="flex flex-col items-center mb-8 animate-fade-in">
          <div className="relative mb-3">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={nickname}
                width={80}
                height={80}
                className="rounded-full object-cover"
                style={{
                  width: 80, height: 80,
                  border: "2.5px solid var(--primary)",
                  boxShadow: "0 0 18px oklch(0.63 0.26 22 / 35%)",
                }}
              />
            ) : (
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl"
                style={{
                  background: "oklch(0.18 0.06 22 / 40%)",
                  border:     "2.5px solid var(--primary)",
                }}>
                👤
              </div>
            )}
            {/* LINE バッジ */}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: "#06C755", fontSize: 12 }}>
              ✓
            </div>
          </div>
          <p className="text-base font-black text-white">{nickname}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">LINE アカウントで連携済み</p>
        </div>

        {/* ── カード ── */}
        <div className="rounded-2xl p-6 animate-slide-up"
          style={{
            background: "oklch(0.10 0.02 22 / 60%)",
            border:     "1px solid oklch(0.63 0.26 22 / 18%)",
            backdropFilter: "blur(12px)",
          }}>

          <div className="mb-5 text-center">
            <p className="text-[11px] font-black tracking-[0.18em] uppercase text-muted-foreground mb-1">
              STEP 1 / 1
            </p>
            <h2 className="text-lg font-black text-white">生年月日を入力</h2>
            <p className="text-[11px] text-muted-foreground mt-1">
              会員サービスのご利用に必要です（20歳以上）
            </p>
          </div>

          {done ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 size={44} style={{ color: "#4ade80" }} />
              <p className="text-sm font-bold text-white">登録完了！</p>
              <p className="text-xs text-muted-foreground">ホームへ移動します...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold tracking-widest uppercase text-muted-foreground mb-2">
                  生年月日
                </label>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  max={maxDate}
                  min="1930-01-01"
                  required
                  className="w-full px-4 py-3 rounded-xl text-white font-medium text-sm"
                  style={{
                    background:   "oklch(0.08 0.02 22 / 80%)",
                    border:       "1px solid oklch(0.63 0.26 22 / 25%)",
                    colorScheme:  "dark",
                    outline:      "none",
                  }}
                />
              </div>

              {error && (
                <p className="text-xs text-destructive text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !birthday}
                className="w-full py-3.5 rounded-xl font-black text-base text-white interactive disabled:opacity-40"
                style={{
                  background:  "linear-gradient(135deg, oklch(0.55 0.22 22) 0%, oklch(0.38 0.18 22) 100%)",
                  boxShadow:   "0 0 22px oklch(0.55 0.22 22 / 35%)",
                  letterSpacing: "0.1em",
                }}>
                {loading
                  ? <Loader2 size={18} className="animate-spin mx-auto" />
                  : "メンバー登録を完了する"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
