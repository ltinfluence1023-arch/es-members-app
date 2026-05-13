"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, RefreshCw, Calendar as CalIcon } from "lucide-react";

type Tab = "chip" | "point";

interface ChipTx {
  id: string;
  amount: number;
  type: string;
  memo: string | null;
  from_user_id: string | null;
  to_user_id: string | null;
  created_by: string | null;
  created_at: string;
}
interface PointTx {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  memo: string | null;
  created_by: string | null;
  created_at: string;
}

interface ApiResponse {
  date: string;
  label: string;
  rangeStart: string;
  rangeEnd: string;
  chipTx: ChipTx[];
  pointTx: PointTx[];
  customerNames: Record<string, string>;
  adminNames: Record<string, string>;
  stats: {
    chipCount: number;
    pointCount: number;
    chipNet: number;
    pointNet: number;
  };
}

const CHIP_TYPE_LABEL: Record<string, string> = {
  admin: "管理操作",
  transfer: "送付",
  checkin: "チェックイン",
  purchase: "購入",
  coupon: "クーポン",
  fee: "手数料",
  seat_out: "ポーカー退席",
  withdraw: "出金",
};

function todayJST(): string {
  const j = new Date(Date.now() + 9 * 3600 * 1000);
  return `${j.getUTCFullYear()}-${String(j.getUTCMonth() + 1).padStart(2, "0")}-${String(j.getUTCDate()).padStart(2, "0")}`;
}
function shiftDate(s: string, days: number) {
  const d = new Date(s);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function fmtTimeJST(iso: string) {
  return new Date(iso).toLocaleTimeString("ja-JP", {
    timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}
function jstDateLabel(iso: string) {
  const d = new Date(iso);
  const jst = new Date(d.getTime() + 9 * 3600 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const da = String(jst.getUTCDate()).padStart(2, "0");
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  const dow = dayNames[jst.getUTCDay()];
  return `${y}/${m}/${da} (${dow})`;
}

export function TransactionsClient() {
  const [date, setDate] = useState(todayJST());
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("chip");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/transactions?date=${date}`);
      const j = await res.json();
      setData(j);
    } finally { setLoading(false); }
  }, [date]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const offsetDays = Math.floor(
    (new Date(todayJST()).getTime() - new Date(date).getTime()) / 86_400_000,
  );

  return (
    <div className="space-y-4">
      {/* Date nav */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDate(shiftDate(date, -1))}
            className="p-1.5 rounded-lg border border-border hover:bg-muted/40 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold min-w-[200px] text-center">
            {jstDateLabel(data?.rangeStart ?? date)}
            {offsetDays === 0 && <span className="text-muted-foreground"> — 本日</span>}
            {offsetDays === 1 && <span className="text-muted-foreground"> — 昨日</span>}
          </span>
          <button
            onClick={() => setDate(shiftDate(date, 1))}
            disabled={date >= todayJST()}
            className="p-1.5 rounded-lg border border-border hover:bg-muted/40 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
          <input
            type="date" value={date} max={todayJST()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-border bg-input px-2 py-1 text-xs font-mono ml-2"
          />
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          更新
        </button>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="チップ取引数" value={data.stats.chipCount} unit="件" />
          <Stat label="チップ純流動" value={data.stats.chipNet} unit="" signed color="var(--chip)" />
          <Stat label="ポイント取引数" value={data.stats.pointCount} unit="件" />
          <Stat label="ポイント純増減" value={data.stats.pointNet} unit="pt" signed color="var(--point)" />
        </div>
      )}

      {/* Tab */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("chip")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-colors ${
            tab === "chip" ? "text-white border-primary" : "border-border text-muted-foreground"
          }`}
          style={tab === "chip" ? { background: "var(--primary)" } : undefined}
        >
          🪙 チップ取引 ({data?.chipTx.length ?? 0})
        </button>
        <button
          onClick={() => setTab("point")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold border transition-colors ${
            tab === "point" ? "text-white border-primary" : "border-border text-muted-foreground"
          }`}
          style={tab === "point" ? { background: "var(--primary)" } : undefined}
        >
          💎 ポイント取引 ({data?.pointTx.length ?? 0})
        </button>
      </div>

      {/* Tables */}
      {tab === "chip" && (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="py-2 px-3 text-left text-muted-foreground font-medium">時刻</th>
                <th className="py-2 px-3 text-left text-muted-foreground font-medium">種別</th>
                <th className="py-2 px-3 text-left text-muted-foreground font-medium">対象</th>
                <th className="py-2 px-3 text-right text-muted-foreground font-medium">金額</th>
                <th className="py-2 px-3 text-left text-muted-foreground font-medium">担当者</th>
                <th className="py-2 px-3 text-left text-muted-foreground font-medium hidden md:table-cell">メモ</th>
              </tr>
            </thead>
            <tbody>
              {(data?.chipTx ?? []).map((tx) => {
                const target = tx.to_user_id ?? tx.from_user_id;
                let isReduction: boolean;
                if (tx.type === "seat_out") isReduction = false;
                else if (tx.type === "withdraw" || tx.type === "fee") isReduction = true;
                else isReduction = !!tx.from_user_id && !tx.to_user_id;
                return (
                  <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="py-2 px-3 font-mono whitespace-nowrap">{fmtTimeJST(tx.created_at)}</td>
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-muted/40 text-[10px] font-bold whitespace-nowrap">
                        {CHIP_TYPE_LABEL[tx.type] ?? tx.type}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                      {target ? (
                        <Link href={`/admin/customers/${target}`} className="hover:text-primary transition-colors">
                          {data?.customerNames[target] ?? "—"}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold whitespace-nowrap"
                      style={{ color: isReduction ? "var(--destructive)" : "var(--chip)" }}>
                      {isReduction ? "-" : "+"}{tx.amount.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {tx.created_by ? (
                        <span className="text-foreground font-medium">{data?.adminNames[tx.created_by] ?? "—"}</span>
                      ) : (
                        <span className="text-muted-foreground">システム</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground hidden md:table-cell">{tx.memo ?? ""}</td>
                  </tr>
                );
              })}
              {(data?.chipTx.length ?? 0) === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">取引なし</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "point" && (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="py-2 px-3 text-left text-muted-foreground font-medium">時刻</th>
                <th className="py-2 px-3 text-left text-muted-foreground font-medium">種別</th>
                <th className="py-2 px-3 text-left text-muted-foreground font-medium">対象</th>
                <th className="py-2 px-3 text-right text-muted-foreground font-medium">金額</th>
                <th className="py-2 px-3 text-left text-muted-foreground font-medium">担当者</th>
                <th className="py-2 px-3 text-left text-muted-foreground font-medium hidden md:table-cell">メモ</th>
              </tr>
            </thead>
            <tbody>
              {(data?.pointTx ?? []).map((tx) => (
                <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="py-2 px-3 font-mono whitespace-nowrap">{fmtTimeJST(tx.created_at)}</td>
                  <td className="py-2 px-3">
                    <span className="px-1.5 py-0.5 rounded bg-muted/40 text-[10px] font-bold">{tx.type}</span>
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">
                    <Link href={`/admin/customers/${tx.user_id}`} className="hover:text-primary transition-colors">
                      {data?.customerNames[tx.user_id] ?? "—"}
                    </Link>
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold whitespace-nowrap"
                    style={{ color: tx.amount < 0 ? "var(--destructive)" : "var(--point)" }}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    {tx.created_by ? (
                      <span className="text-foreground font-medium">{data?.adminNames[tx.created_by] ?? "—"}</span>
                    ) : (
                      <span className="text-muted-foreground">システム</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground hidden md:table-cell">{tx.memo ?? ""}</td>
                </tr>
              ))}
              {(data?.pointTx.length ?? 0) === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">取引なし</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground font-mono text-center">
        <CalIcon size={10} className="inline mr-1" />
        集計: {data?.label ?? jstDateLabel(date)} 06:00 〜 翌 05:59 (JST)
      </p>
    </div>
  );
}

function Stat({
  label, value, unit, signed, color,
}: { label: string; value: number | string; unit?: string; signed?: boolean; color?: string }) {
  const num = typeof value === "number" ? value : 0;
  const sign = signed && num > 0 ? "+" : "";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-black font-mono" style={{ color: color ?? "var(--primary)" }}>
        {typeof value === "number" ? `${sign}${num.toLocaleString()}` : value}
        {unit && <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>}
      </p>
    </div>
  );
}
