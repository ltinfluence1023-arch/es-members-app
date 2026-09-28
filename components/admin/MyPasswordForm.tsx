"use client";

import { useState } from "react";
import { toast } from "sonner";

export function MyPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "変更に失敗しました"); return; }
      toast.success("パスワードを変更しました");
      setPassword("");
      setConfirmPassword("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">新しいパスワード</label>
        <input
          type="password" required minLength={8} value={password} autoComplete="new-password"
          onChange={(e) => setPassword(e.target.value)}
          placeholder="8文字以上"
          className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">確認のためもう一度</label>
        <input
          type="password" required minLength={8} value={confirmPassword} autoComplete="new-password"
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm font-mono"
        />
        {mismatch && <p className="text-xs text-destructive">パスワードが一致しません</p>}
      </div>
      <button
        type="submit" disabled={loading || mismatch || password.length < 8}
        className="w-full rounded-lg py-2.5 text-sm font-bold text-white interactive disabled:opacity-50"
        style={{ background: "var(--primary)" }}
      >
        {loading ? "変更中..." : "変更する"}
      </button>
    </form>
  );
}
