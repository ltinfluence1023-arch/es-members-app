"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, RefreshCw, Trophy, Calendar as CalIcon } from "lucide-react";

type RankType = "daily_chip" | "monthly_chip" | "yearly_chip" | "yearly_visit" | "total_chip";

interface Entry {
  rank: number;
  userId: string;
  nickname: string;
  rankName: string | null;
  value: number;
  unit: string;
}

interface RankingsData {
  type: RankType;
  label: string;
  gdp?: number;
  ranking: Entry[];
}

const TYPES: { key: RankType; label: string }[] = [
  { key: "daily_chip", label: "日次（増減）" },
  { key: "monthly_chip", label: "月次（増減）" },
  { key: "yearly_chip", label: "年次（増減）" },
  { key: "yearly_visit", label: "年次（来店）" },
  { key: "total_chip", label: "保有合計" },
];

function todayJST() {
  const j = new Date(Date.now() + 9 * 3600 * 1000);
  return `${j.getUTCFullYear()}-${String(j.getUTCMonth() + 1).padStart(2, "0")}-${String(j.getUTCDate()).padStart(2, "0")}`;
}
function thisMonth() {
  return todayJST().slice(0, 7);
}
function thisYear() {
  return String(new Date().getFullYear());
}
function shiftDate(s: string, days: number) {
  const d = new Date(s);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function shiftMonth(s: string, months: number) {
  const [y, m] = s.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function RankingsClient() {
  const [type, setType] = useState<RankType>("daily_chip");
  const [date, setDate] = useState(todayJST());
  const [month, setMonth] = useState(thisMonth());
  const [year, setYear] = useState(thisYear());
  const [data, setData] = useState<RankingsData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type });
      if (type === "daily_chip") params.set("date", date);
      else if (type === "monthly_chip") params.set("month", month);
      else if (type === "yearly_chip" || type === "yearly_visit") params.set("year", year);
      const res = await fetch(`/api/admin/rankings?${params.toString()}`);
      const j = await res.json();
      setData(j);
    } finally { setLoading(false); }
  }, [type, date, month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showNav = type === "daily_chip" || type === "monthly_chip" || type === "yearly_chip" || type === "yearly_visit";

  return (
    <div className="space-y-4">
      {/* Type tabs */}
      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setType(t.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-bold transition-colors border ${
              type === t.key ? "text-white border-primary" : "border-border text-muted-foreground"
            }`}
            style={type === t.key ? { background: "var(--primary)" } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Period nav: prev/next + date input */}
      {showNav && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (type === "daily_chip") setDate(shiftDate(date, -1));
                else if (type === "monthly_chip") setMonth(shiftMonth(month, -1));
                else if (type === "yearly_chip" || type === "yearly_visit") setYear(String(Number(year) - 1));
              }}
              className="p-1.5 rounded-lg border border-border hover:bg-muted/40 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {type === "daily_chip" && (
              <input type="date" value={date} max={todayJST()}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-border bg-input px-3 py-1.5 text-sm font-mono" />
            )}
            {type === "monthly_chip" && (
              <input type="month" value={month} max={thisMonth()}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-lg border border-border bg-input px-3 py-1.5 text-sm font-mono" />
            )}
            {(type === "yearly_chip" || type === "yearly_visit") && (
              <input type="number" min="2024" max={thisYear()} value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-24 rounded-lg border border-border bg-input px-3 py-1.5 text-sm font-mono text-center" />
            )}
            <button
              onClick={() => {
                if (type === "daily_chip" && date !== todayJST()) setDate(shiftDate(date, 1));
                else if (type === "monthly_chip" && month !== thisMonth()) setMonth(shiftMonth(month, 1));
                else if ((type === "yearly_chip" || type === "yearly_visit") && Number(year) < Number(thisYear())) {
                  setYear(String(Number(year) + 1));
                }
              }}
              disabled={
                (type === "daily_chip" && date >= todayJST()) ||
                (type === "monthly_chip" && month >= thisMonth()) ||
                ((type === "yearly_chip" || type === "yearly_visit") && Number(year) >= Number(thisYear()))
              }
              className="p-1.5 rounded-lg border border-border hover:bg-muted/40 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
            <span className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
              <CalIcon size={12} />
              {data?.label ?? ""}
            </span>
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
      )}

      {/* Stats summary */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <Stat label="ランクイン人数" value={`${data.ranking.length}`} unit="人" />
          {data.type !== "total_chip" && (
            <Stat
              label={data.type === "yearly_visit" ? "総来店回数" : "GDP"}
              value={(data.type === "yearly_visit"
                ? data.ranking.reduce((s, r) => s + r.value, 0)
                : (data.gdp ?? 0)
              ).toLocaleString()}
              unit={data.type === "yearly_visit" ? "回" : "chip"}
            />
          )}
          <Stat label="集計期間" value={data.label} mono />
        </div>
      )}

      {/* Ranking table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="py-2.5 px-4 text-left text-xs text-muted-foreground font-medium w-16">順位</th>
              <th className="py-2.5 px-4 text-left text-xs text-muted-foreground font-medium">ニックネーム</th>
              <th className="py-2.5 px-4 text-left text-xs text-muted-foreground font-medium hidden md:table-cell">ランク</th>
              <th className="py-2.5 px-4 text-right text-xs text-muted-foreground font-medium">値</th>
            </tr>
          </thead>
          <tbody>
            {(data?.ranking ?? []).map((e) => {
              const positive = e.value >= 0;
              const rankColor = e.rank === 1 ? "#FFD700" : e.rank === 2 ? "#C0C0C0" : e.rank === 3 ? "#CD7F32" : "var(--muted-foreground)";
              return (
                <tr key={e.userId} className="border-b border-border last:border-0 hover:bg-muted/20 group cursor-pointer">
                  <td className="py-3 px-4">
                    <Link href={`/admin/customers/${e.userId}`} className="flex items-center gap-1.5">
                      {e.rank <= 3 && <Trophy size={14} style={{ color: rankColor }} />}
                      <span className="font-black" style={{ color: rankColor, fontSize: e.rank <= 3 ? 16 : 14 }}>
                        {e.rank}
                      </span>
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <Link href={`/admin/customers/${e.userId}`} className="block font-medium group-hover:text-primary transition-colors">
                      {e.nickname}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs hidden md:table-cell">
                    <Link href={`/admin/customers/${e.userId}`} className="block">{e.rankName ?? "—"}</Link>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link href={`/admin/customers/${e.userId}`}
                      className="font-mono font-bold whitespace-nowrap"
                      style={{
                        color: positive ? "var(--chip)" : "var(--destructive)",
                        textShadow: positive ? "0 0 10px oklch(0.65 0.26 22 / 50%)" : undefined,
                      }}
                    >
                      {positive && data?.type !== "total_chip" && data?.type !== "yearly_visit" ? "+" : ""}
                      {e.value.toLocaleString()}
                      <span className="text-xs font-normal text-muted-foreground ml-1">{e.unit}</span>
                    </Link>
                  </td>
                </tr>
              );
            })}
            {data?.ranking.length === 0 && (
              <tr><td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">データがありません</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, unit, mono }: { label: string; value: string; unit?: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-xl font-black ${mono ? "font-mono text-sm" : ""}`} style={{ color: mono ? undefined : "var(--primary)" }}>
        {value}{unit && <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>}
      </p>
    </div>
  );
}
