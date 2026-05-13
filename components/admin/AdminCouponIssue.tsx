"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface User { id: string; nickname: string }
interface Template { id: string; name: string }

export function AdminCouponIssue({ users, templates }: { users: User[]; templates: Template[] }) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !templateId) { toast.error("顧客とテンプレートを選択してください"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/coupons/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, templateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("クーポンを発行しました");
      setUserId("");
      setTemplateId("");
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
        <label className="text-sm font-medium">顧客</label>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">選択してください</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.nickname}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">クーポンテンプレート</label>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">選択してください</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "発行中..." : "発行する"}
      </button>
    </form>
  );
}
