"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AdminChipOp({ userId }: { userId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"add" | "sub">("add");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseInt(amount, 10);
    if (!num || num <= 0) { toast.error("金額を入力してください"); return; }

    const finalAmount = mode === "add" ? num : -num;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/chip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: finalAmount, memo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(mode === "add" ? `+${num} チップを付与しました` : `-${num} チップを減算しました`);
      setAmount("");
      setMemo("");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <p className="text-sm font-semibold">🪙 チップ操作</p>

      {/* Mode toggle */}
      <div className="flex rounded-lg overflow-hidden border border-border">
        <button
          type="button"
          onClick={() => setMode("add")}
          className={`flex-1 py-1.5 text-sm font-bold transition-colors ${mode === "add" ? "text-white" : "text-muted-foreground"}`}
          style={mode === "add" ? { background: "var(--chip)" } : undefined}
        >
          ＋ 付与
        </button>
        <button
          type="button"
          onClick={() => setMode("sub")}
          className={`flex-1 py-1.5 text-sm font-bold transition-colors ${mode === "sub" ? "text-white" : "text-muted-foreground"}`}
          style={mode === "sub" ? { background: "var(--destructive)" } : undefined}
        >
          － 減算
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="金額"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="メモ（省略時: 管理者操作）"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          style={{ background: mode === "add" ? "var(--chip)" : "var(--destructive)" }}
        >
          {loading ? "処理中..." : mode === "add" ? "付与する" : "減算する"}
        </button>
      </form>
    </div>
  );
}
