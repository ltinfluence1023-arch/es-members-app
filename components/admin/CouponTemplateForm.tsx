"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CouponTemplateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    point_cost: "",
    valid_days: "30",
    max_issuance: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("名称を入力してください"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/coupon-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          point_cost: form.point_cost ? parseInt(form.point_cost) : null,
          valid_days: parseInt(form.valid_days) || 30,
          max_issuance: form.max_issuance ? parseInt(form.max_issuance) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("テンプレートを作成しました");
      setForm({ name: "", description: "", point_cost: "", valid_days: "30", max_issuance: "" });
      setOpen(false);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-primary text-primary px-4 py-2 text-sm hover:bg-primary/10 transition-colors"
      >
        + 新規テンプレート作成
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-4 space-y-3">
      <p className="text-sm font-semibold">新規テンプレート</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">名称 *</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">説明</label>
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">ポイントコスト（空白=管理者発行のみ）</label>
          <input
            type="number"
            min={1}
            value={form.point_cost}
            onChange={(e) => setForm({ ...form, point_cost: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">有効日数</label>
          <input
            type="number"
            min={1}
            value={form.valid_days}
            onChange={(e) => setForm({ ...form, valid_days: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">発行上限（空白=無制限）</label>
          <input
            type="number"
            min={1}
            value={form.max_issuance}
            onChange={(e) => setForm({ ...form, max_issuance: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "作成中..." : "作成"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
