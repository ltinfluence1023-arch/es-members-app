"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, Plus, Minus, Coins, ArrowLeftRight, Sparkles } from "lucide-react";

interface FeeTx {
  id: string;
  amount: number;
  source: "transfer_fee" | "rake" | "manual_add" | "manual_subtract";
  memo: string | null;
  related_user_id: string | null;
  relatedUserName: string | null;
  operatorName: string | null;
  created_at: string;
}

interface FeesData {
  total: number;
  breakdown: {
    transferFees: number;
    rakeAdded: number;
    manualAdded: number;
    manualSubtracted: number;
  };
  transactions: FeeTx[];
}

const SOURCE_LABEL: Record<FeeTx["source"], string> = {
  transfer_fee: "送付手数料",
  rake: "ポーカーレーキ",
  manual_add: "手動追加",
  manual_subtract: "手動減算",
};

const SOURCE_COLOR: Record<FeeTx["source"], string> = {
  transfer_fee: "var(--chip)",
  rake: "var(--primary)",
  manual_add: "#4ade80",
  manual_subtract: "var(--destructive)",
};

export function FeesClient({ initialData, isMaster = false }: { initialData: FeesData; isMaster?: boolean }) {
  const router = useRouter();
  const [data, setData] = useState<FeesData>(initialData);
  const [loading, setLoading] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/fees");
      const json: FeesData = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          更新
        </button>
        <button
          onClick={() => setShowAdjust(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-white interactive"
          style={{ background: "var(--primary)" }}
        >
          <Plus size={14} />
          手動増減 / レーキ
        </button>
      </div>

      {/* Total */}
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase mb-2">手数料総計</p>
        <p className="text-5xl font-black font-mono" style={{ color: "var(--chip)" }}>
          {data.total.toLocaleString()}
          <span className="text-base text-muted-foreground font-normal ml-2">chip</span>
        </p>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <BreakdownCard label="送付手数料" value={data.breakdown.transferFees} icon={ArrowLeftRight} color="var(--chip)" />
        <BreakdownCard label="ポーカーレーキ" value={data.breakdown.rakeAdded} icon={Coins} color="var(--primary)" />
        <BreakdownCard label="手動追加" value={data.breakdown.manualAdded} icon={Plus} color="#4ade80" />
        <BreakdownCard label="手動減算" value={data.breakdown.manualSubtracted} icon={Minus} color="var(--destructive)" sign="-" />
      </div>

      {/* History table */}
      <div>
        <h3 className="text-sm font-semibold mb-2">履歴（直近100件）</h3>
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="py-2 px-3 text-left text-muted-foreground font-medium">区分</th>
                <th className="py-2 px-3 text-right text-muted-foreground font-medium">金額</th>
                <th className="py-2 px-3 text-left text-muted-foreground font-medium">メモ</th>
                <th className="py-2 px-3 text-left text-muted-foreground font-medium">操作者 / 関連ユーザー</th>
                <th className="py-2 px-3 text-left text-muted-foreground font-medium">日時</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                      style={{ background: `${SOURCE_COLOR[t.source]}22`, color: SOURCE_COLOR[t.source] }}
                    >
                      {SOURCE_LABEL[t.source]}
                    </span>
                  </td>
                  <td
                    className="py-2 px-3 text-right font-mono font-bold whitespace-nowrap"
                    style={{ color: t.amount < 0 ? "var(--destructive)" : "var(--chip)" }}
                  >
                    {t.amount > 0 ? "+" : ""}
                    {t.amount.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">{t.memo ?? "—"}</td>
                  <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                    {t.operatorName ? <span className="text-foreground font-medium">{t.operatorName}</span> : "—"}
                    {t.relatedUserName && (
                      <span className="text-muted-foreground"> / {t.relatedUserName}</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                    {new Date(t.created_at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
              {data.transactions.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">履歴がありません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdjust && (
        <AdjustModal
          isMaster={isMaster}
          onClose={() => setShowAdjust(false)}
          onSuccess={() => { setShowAdjust(false); fetchData(); router.refresh(); }}
        />
      )}
    </div>
  );
}

function BreakdownCard({
  label, value, icon: Icon, color, sign,
}: {
  label: string; value: number; icon: React.ElementType; color: string; sign?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
      <div className="rounded-lg p-2" style={{ background: `${color}22` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
        <p className="text-xl font-black font-mono leading-none" style={{ color }}>
          {sign ?? ""}{value.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function AdjustModal({ onClose, onSuccess, isMaster }: { onClose: () => void; onSuccess: () => void; isMaster: boolean }) {
  // Default mode: rake for master, add for staff (since rake/sub are master-only)
  const [mode, setMode] = useState<"rake" | "add" | "sub">(isMaster ? "rake" : "add");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseInt(amount, 10);
    if (!num || num <= 0) { toast.error("金額を入力してください"); return; }
    if (!memo.trim()) { toast.error("メモを入力してください"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, amount: num, memo: memo.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "失敗"); return; }
      toast.success("反映しました");
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-5 space-y-4 animate-page-in">
        <h2 className="text-lg font-bold">手数料 手動増減</h2>

        <div>
          <label className="text-xs text-muted-foreground">区分</label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            <ModeBtn current={mode} value="rake" onClick={() => setMode("rake")} icon={Sparkles} label="レーキ" color="var(--primary)" disabled={!isMaster} />
            <ModeBtn current={mode} value="add" onClick={() => setMode("add")} icon={Plus} label="追加" color="#4ade80" />
            <ModeBtn current={mode} value="sub" onClick={() => setMode("sub")} icon={Minus} label="減算" color="var(--destructive)" disabled={!isMaster} />
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">金額</label>
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="例: 500"
              className="w-full mt-1 rounded-lg border border-border bg-input px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">メモ（必須）</label>
            <input
              type="text"
              required
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="例: ポーカー卓1 レーキ"
              className="w-full mt-1 rounded-lg border border-border bg-input px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg py-2.5 text-sm font-bold border border-border text-muted-foreground"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg py-2.5 text-sm font-bold text-white interactive disabled:opacity-50"
              style={{ background: "var(--primary)" }}
            >
              {loading ? "処理中..." : "確定"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModeBtn<T extends string>({
  current, value, onClick, icon: Icon, label, color, disabled,
}: {
  current: T; value: T; onClick: () => void; icon: React.ElementType; label: string; color: string; disabled?: boolean;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? "マスター権限のみ" : undefined}
      className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-bold border transition-colors ${
        active ? "text-white" : "text-muted-foreground border-border"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
      style={active && !disabled ? { background: color, borderColor: color } : undefined}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}
