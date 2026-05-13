"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AdminCouponRedeem() {
  const router = useRouter();
  const [couponId, setCouponId] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!couponId.trim()) { toast.error("クーポンIDを入力してください"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/coupons/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couponId: couponId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`「${data.templateName}」を使用済みにしました`);
      setCouponId("");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">クーポンID（UUID）</label>
        <input
          value={couponId}
          onChange={(e) => setCouponId(e.target.value)}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "処理中..." : "使用済みにする"}
      </button>
    </form>
  );
}
