"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle } from "lucide-react";

type Stage = "idle" | "confirm1" | "confirm2" | "presented";

export function CouponUseClient({ couponId }: { couponId: string }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [loading, setLoading] = useState(false);
  const [usedAt, setUsedAt] = useState<Date | null>(null);

  async function performUse() {
    setLoading(true);
    try {
      const res = await fetch("/api/coupons/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couponId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsedAt(new Date());
      setStage("presented");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "エラーが発生しました");
      setStage("idle");
    } finally {
      setLoading(false);
    }
  }

  // Final "show this to staff" screen
  if (stage === "presented" && usedAt) {
    return (
      <div className="space-y-6 animate-page-in">
        <div
          className="rounded-2xl py-10 px-6 text-center space-y-4"
          style={{
            background: "linear-gradient(135deg, oklch(0.55 0.26 22), oklch(0.32 0.22 22))",
            boxShadow: "0 0 32px oklch(0.55 0.26 22 / 40%)",
          }}
        >
          <CheckCircle2 size={64} className="text-white mx-auto drop-shadow-lg" strokeWidth={2.4} />
          <h2 className="text-3xl font-black text-white tracking-wide">使用済み</h2>
          <p className="text-white/95 text-[16px] font-bold">この画面をスタッフにご提示ください</p>
          <p className="text-white/80 text-[12px] font-mono">
            {usedAt.toLocaleString("ja-JP", {
              year: "numeric", month: "2-digit", day: "2-digit",
              hour: "2-digit", minute: "2-digit", second: "2-digit",
            })}
          </p>
          <p className="text-white/70 text-[10px] tracking-[0.18em] uppercase font-bold">used at</p>
        </div>
        <button
          onClick={() => { router.push("/coupons"); router.refresh(); }}
          className="w-full rounded-xl py-3 text-[14px] font-bold border-2 border-border text-muted-foreground"
        >
          クーポン一覧へ戻る
        </button>
      </div>
    );
  }

  // 2nd confirmation
  if (stage === "confirm2") {
    return (
      <div className="space-y-3 animate-page-in">
        <div
          className="rounded-2xl px-5 py-5 text-center space-y-2 border-2"
          style={{ borderColor: "var(--destructive)", background: "oklch(0.18 0.05 22 / 50%)" }}
        >
          <AlertTriangle size={36} style={{ color: "var(--destructive)" }} className="mx-auto" />
          <p className="text-[16px] font-black">本当に使用しますか？</p>
          <p className="text-[13px] text-muted-foreground">
            使用するとこのクーポンは元に戻せません。<br />
            スタッフ前で使用ボタンを押してください。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setStage("idle")}
            className="flex-1 rounded-xl py-3.5 text-[14px] font-bold border-2 border-border text-muted-foreground interactive"
          >
            キャンセル
          </button>
          <button
            onClick={performUse}
            disabled={loading}
            className="flex-1 rounded-xl py-3.5 text-[14px] font-black text-white interactive disabled:opacity-50"
            style={{
              background: "var(--destructive)",
              boxShadow: "0 0 16px oklch(0.55 0.24 22 / 50%)",
            }}
          >
            {loading ? "処理中..." : "確定して使用"}
          </button>
        </div>
      </div>
    );
  }

  // 1st confirmation
  if (stage === "confirm1") {
    return (
      <div className="space-y-3 animate-page-in">
        <div className="card-elevated rounded-2xl px-5 py-5 text-center space-y-2">
          <p className="text-[16px] font-black">このクーポンを使用しますか？</p>
          <p className="text-[13px] text-muted-foreground">
            ※ 使用後は元に戻せません
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setStage("idle")}
            className="flex-1 rounded-xl py-3.5 text-[14px] font-bold border-2 border-border text-muted-foreground interactive"
          >
            戻る
          </button>
          <button
            onClick={() => setStage("confirm2")}
            className="flex-1 rounded-xl py-3.5 text-[14px] font-black text-white interactive"
            style={{
              background: "var(--primary)",
              boxShadow: "0 0 16px oklch(0.65 0.26 22 / 45%)",
            }}
          >
            次へ
          </button>
        </div>
      </div>
    );
  }

  // Initial
  return (
    <button
      onClick={() => setStage("confirm1")}
      className="w-full rounded-2xl py-4 text-[16px] font-black text-white interactive"
      style={{
        background: "var(--primary)",
        boxShadow: "0 0 20px oklch(0.65 0.26 22 / 50%), inset 0 0 16px oklch(0.50 0.26 22 / 40%)",
      }}
    >
      使用する
    </button>
  );
}
