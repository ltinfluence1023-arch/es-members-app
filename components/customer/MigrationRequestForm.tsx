"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function MigrationRequestForm({ userId, nickname }: { userId: string; nickname: string }) {
  const router = useRouter();
  const [legacyMemberId, setLegacyMemberId] = useState("");
  const [legacyName, setLegacyName] = useState("");
  const [reportedChips, setReportedChips] = useState("");
  const [loading, setLoading] = useState(false);

  const chips = parseInt(reportedChips, 10);
  const canSubmit = legacyMemberId.trim() && legacyName.trim() && Number.isFinite(chips) && chips >= 0 && !loading;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      const res = await fetch("/api/migration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legacyMemberId, legacyName, reportedChips: chips }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("申請を受け付けました");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="card-elevated rounded-2xl p-4 space-y-3">
        <p className="label-gaming">旧アプリ</p>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">会員ID</label>
          <input value={legacyMemberId} onChange={(e) => setLegacyMemberId(e.target.value)}
            inputMode="numeric" placeholder="例: 1005838" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">お名前（旧アプリに登録した氏名）</label>
          <input value={legacyName} onChange={(e) => setLegacyName(e.target.value)}
            placeholder="例: 山田 太郎" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">チップ残高</label>
          <input type="number" min={0} inputMode="numeric" value={reportedChips}
            onChange={(e) => setReportedChips(e.target.value)} placeholder="例: 5000" className={`${inputClass} font-mono`} />
        </div>
      </section>

      <section className="card-elevated rounded-2xl p-4 space-y-2">
        <p className="label-gaming">新アプリ（このアカウント）</p>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">お名前</span>
          <span className="font-semibold">{nickname}</span>
        </div>
        <div className="flex justify-between gap-3 text-sm">
          <span className="shrink-0 text-muted-foreground">ID</span>
          <span className="font-mono text-xs break-all text-right">{userId}</span>
        </div>
      </section>

      <button type="submit" disabled={!canSubmit}
        className="w-full rounded-xl py-3 text-sm font-black text-white interactive disabled:opacity-40"
        style={{ background: "var(--primary)" }}>
        {loading ? "送信中..." : "引き継ぎを申請する"}
      </button>
    </form>
  );
}
