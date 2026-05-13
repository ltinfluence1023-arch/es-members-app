"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AdminNoticeForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    body: "",
    is_published: true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("タイトルと本文を入力してください");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("お知らせを作成しました");
      setForm({ title: "", body: "", is_published: true });
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
        + 新規お知らせ作成
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-4 space-y-3">
      <p className="text-sm font-semibold">新規お知らせ</p>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">タイトル</label>
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">本文</label>
        <textarea
          rows={5}
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      </div>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_published}
            onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
            className="rounded"
          />
          公開する
        </label>
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
