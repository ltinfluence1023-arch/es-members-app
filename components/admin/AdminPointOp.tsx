"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AdminPointOp({ userId }: { userId: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseInt(amount, 10);
    if (!num || num === 0) { toast.error("金額を入力してください"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/point", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: num, memo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("ポイントを操作しました");
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
      <p className="text-sm font-semibold">💎 ポイント操作</p>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="金額（負数で減算）"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="メモ（任意）"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "処理中..." : "実行"}
        </button>
      </form>
    </div>
  );
}
