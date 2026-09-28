"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AvatarImage } from "@/components/customer/AvatarImage";

export type MigrationRequestView = {
  id: string;
  legacyMemberId: string;
  legacyName: string;
  reportedChips: number;
  status: "pending" | "approved" | "rejected";
  grantedChips: number | null;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewerName: string | null;
  user: { id: string; nickname: string; avatar_url: string | null; chip_balance: number; created_at: string };
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

function PendingCard({ req }: { req: MigrationRequestView }) {
  const router = useRouter();
  const [chips, setChips] = useState(String(req.reportedChips));
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const [loading, setLoading] = useState(false);
  const n = parseInt(chips, 10);

  async function submit(action: "approve" | "reject") {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/migrations/${req.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "approve" ? { action, chips: n, note: note || undefined } : { action, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(action === "approve"
        ? `${req.user.nickname} さんに ${n.toLocaleString()} チップを引き継ぎました`
        : `${req.user.nickname} さんの申請を却下しました`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-muted/40 p-3 space-y-1 text-sm">
          <p className="text-[11px] font-semibold text-muted-foreground">旧アプリ（申請内容）</p>
          <p><span className="text-muted-foreground">会員ID </span><span className="font-mono font-bold select-all">{req.legacyMemberId}</span></p>
          <p><span className="text-muted-foreground">氏名 </span><span className="font-bold">{req.legacyName}</span></p>
          <p><span className="text-muted-foreground">チップ残高 </span><span className="font-mono font-bold" style={{ color: "var(--chip)" }}>{req.reportedChips.toLocaleString()}</span></p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3 text-sm">
          <p className="text-[11px] font-semibold text-muted-foreground mb-1">新アプリ</p>
          <div className="flex items-center gap-2.5">
            <AvatarImage userId={req.user.id} nickname={req.user.nickname} src={req.user.avatar_url} size={36} />
            <div className="min-w-0">
              <p className="font-bold truncate">{req.user.nickname}</p>
              <p className="font-mono text-[10px] text-muted-foreground break-all">{req.user.id}</p>
            </div>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            現在の残高 {req.user.chip_balance.toLocaleString()} / 登録 {fmt(req.user.created_at)}
          </p>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">申請 {fmt(req.createdAt)}</p>

      {mode === "idle" && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setMode("approve")} className="rounded-lg bg-primary py-2 text-sm font-bold text-primary-foreground">承認</button>
          <button onClick={() => setMode("reject")} className="rounded-lg border border-border py-2 text-sm text-muted-foreground hover:bg-muted">却下</button>
        </div>
      )}

      {mode === "approve" && (
        <div className="space-y-2 rounded-lg border border-primary/40 p-3">
          <label className="text-sm font-medium">引き継ぐチップ数（旧データと照合した値）</label>
          <input type="number" min={0} inputMode="numeric" value={chips} onChange={(e) => setChips(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono" />
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="メモ（任意）"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setMode("idle")} className="rounded-lg border border-border py-2 text-sm text-muted-foreground">戻る</button>
            <button onClick={() => submit("approve")} disabled={loading || !Number.isFinite(n) || n < 0}
              className="rounded-lg bg-primary py-2 text-sm font-bold text-primary-foreground disabled:opacity-40">
              {loading ? "処理中..." : `${Number.isFinite(n) ? n.toLocaleString() : "—"} チップで承認`}
            </button>
          </div>
        </div>
      )}

      {mode === "reject" && (
        <div className="space-y-2 rounded-lg border border-destructive/40 p-3">
          <label className="text-sm font-medium">却下理由（お客様にLINEで届きます）</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200}
            placeholder="例: 会員IDと氏名が一致しませんでした"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setMode("idle")} className="rounded-lg border border-border py-2 text-sm text-muted-foreground">戻る</button>
            <button onClick={() => submit("reject")} disabled={loading || !note.trim()}
              className="rounded-lg bg-destructive py-2 text-sm font-bold text-white disabled:opacity-40">
              {loading ? "処理中..." : "却下する"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function MigrationsReview({ pending, processed }: { pending: MigrationRequestView[]; processed: MigrationRequestView[] }) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">未処理 <span className="text-muted-foreground">{pending.length}件</span></h2>
        {pending.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">未処理の申請はありません</p>
        ) : (
          pending.map((r) => <PendingCard key={r.id} req={r} />)
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">処理済み（直近50件）</h2>
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                <th className="py-2 px-3 text-left font-medium">処理日時</th>
                <th className="py-2 px-3 text-left font-medium">新アプリ</th>
                <th className="py-2 px-3 text-left font-medium">旧会員ID / 氏名</th>
                <th className="py-2 px-3 text-right font-medium">申請 / 付与</th>
                <th className="py-2 px-3 text-left font-medium">結果</th>
              </tr>
            </thead>
            <tbody>
              {processed.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">まだありません</td></tr>
              )}
              {processed.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="py-2 px-3 text-xs font-mono whitespace-nowrap">{r.reviewedAt ? fmt(r.reviewedAt) : "—"}</td>
                  <td className="py-2 px-3">{r.user.nickname}</td>
                  <td className="py-2 px-3 text-xs"><span className="font-mono">{r.legacyMemberId}</span> / {r.legacyName}</td>
                  <td className="py-2 px-3 text-right font-mono text-xs whitespace-nowrap">
                    {r.reportedChips.toLocaleString()} / {r.grantedChips?.toLocaleString() ?? "—"}
                  </td>
                  <td className="py-2 px-3 text-xs">
                    <span className={r.status === "approved" ? "font-bold" : "text-destructive"}>
                      {r.status === "approved" ? "承認" : "却下"}
                    </span>
                    {r.reviewerName && <span className="text-muted-foreground">（{r.reviewerName}）</span>}
                    {r.reviewNote && <p className="text-muted-foreground">{r.reviewNote}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
