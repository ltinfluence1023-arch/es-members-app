"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Users, CalendarCheck, TrendingUp, Coins, Calendar as CalIcon } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import Link from "next/link";

interface UserEntry {
  id: string;
  nickname: string;
  value: number;
  rankName: string | null;
}

interface ChipFlow {
  transfer: number;
  adminGrant: number;
  adminReduction: number;
  checkin: number;
  gdp: number;
}

interface DailyPoint {
  date: string;
  checkins: number;
  gdp: number;
  transfer: number;
  adminGrant: number;
  checkin: number;
}

interface ReportsData {
  period: "day" | "month";
  label: string;
  range: { start: string; end: string };
  totalUsers: number;
  newUsersInPeriod: number;
  checkinCount: number;
  flow: ChipFlow;
  dailyChart: DailyPoint[];
  topChip: UserEntry[];
  topPoint: UserEntry[];
}

function todayJSTYmd(): string {
  const j = new Date(Date.now() + 9 * 3600 * 1000);
  return `${j.getUTCFullYear()}-${String(j.getUTCMonth() + 1).padStart(2, "0")}-${String(j.getUTCDate()).padStart(2, "0")}`;
}
function thisMonthJSTYm(): string {
  const j = new Date(Date.now() + 9 * 3600 * 1000);
  return `${j.getUTCFullYear()}-${String(j.getUTCMonth() + 1).padStart(2, "0")}`;
}

function KPICard({ label, value, unit, icon: Icon, color, sub }: {
  label: string; value: number; unit?: string; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
      <div className="rounded-lg p-2.5" style={{ background: `${color}22` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-2xl font-black leading-none" style={{ color }}>
          {value.toLocaleString()}
          {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
        </p>
        {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function TopList({ title, entries, unit }: { title: string; entries: UserEntry[]; unit: string }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="divide-y divide-border">
        {entries.map((u, i) => (
          <Link key={u.id} href={`/admin/customers/${u.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
            <span
              className="text-sm font-black w-6 text-center"
              style={{
                color: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "var(--muted-foreground)",
              }}
            >
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{u.nickname}</p>
              {u.rankName && <p className="text-xs text-muted-foreground">{u.rankName}</p>}
            </div>
            <span className="text-sm font-mono font-bold text-right" style={{ color: "var(--chip)" }}>
              {u.value.toLocaleString()}
              <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
            </span>
          </Link>
        ))}
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">データなし</p>
        )}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number; name: string; dataKey?: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-mono">
          <span className="text-muted-foreground">{p.name}: </span>
          <span className="font-bold">{p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
};

export function ReportsClient({ initialData }: { initialData: ReportsData }) {
  const [data, setData] = useState<ReportsData>(initialData);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<"day" | "month">("day");
  const [date, setDate] = useState<string>(todayJSTYmd());
  const [month, setMonth] = useState<string>(thisMonthJSTYm());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("period", period);
      if (period === "day") params.set("date", date);
      else params.set("month", month);
      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      const json: ReportsData = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [period, date, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setPeriod("day")}
              className={`px-3 py-1.5 text-sm font-bold transition-colors ${
                period === "day" ? "text-white" : "text-muted-foreground hover:bg-muted/30"
              }`}
              style={period === "day" ? { background: "var(--primary)" } : undefined}
            >
              日
            </button>
            <button
              onClick={() => setPeriod("month")}
              className={`px-3 py-1.5 text-sm font-bold transition-colors border-l border-border ${
                period === "month" ? "text-white" : "text-muted-foreground hover:bg-muted/30"
              }`}
              style={period === "month" ? { background: "var(--primary)" } : undefined}
            >
              月
            </button>
          </div>
          {period === "day" ? (
            <input
              type="date"
              value={date}
              max={todayJSTYmd()}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-border bg-input px-3 py-1.5 text-sm font-mono"
            />
          ) : (
            <input
              type="month"
              value={month}
              max={thisMonthJSTYm()}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-border bg-input px-3 py-1.5 text-sm font-mono"
            />
          )}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalIcon size={12} />
            {data.label}
          </span>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          更新
        </button>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="総会員数" value={data.totalUsers} unit="人" icon={Users} color="var(--primary)" />
        <KPICard label="期間内チェックイン" value={data.checkinCount} unit="件" icon={CalendarCheck} color="var(--point)" />
        <KPICard label="期間内新規登録" value={data.newUsersInPeriod} unit="人" icon={TrendingUp} color="#4ade80" />
        <KPICard label="GDP（ユーザー間送付）" value={data.flow.gdp} icon={Coins} color="var(--chip)" sub="トランスファーのチップ移動量" />
      </div>

      {/* Chip flow breakdown */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">チップフロー内訳</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground mb-1">送付（ユーザー間）</p>
            <p className="text-xl font-black font-mono">{data.flow.transfer.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground mb-1">手動付与</p>
            <p className="text-xl font-black font-mono">{data.flow.adminGrant.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground mb-1">チェックイン付与</p>
            <p className="text-xl font-black font-mono">{data.flow.checkin.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground mb-1">手動減算（参考）</p>
            <p className="text-xl font-black font-mono" style={{ color: "var(--destructive)" }}>
              -{data.flow.adminReduction.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Daily chart (only meaningful for month view) */}
      {period === "month" && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-4">日別 チェックイン数 ＆ GDP</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.dailyChart} margin={{ top: 0, right: 0, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={1} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)/20" }} />
              <Bar yAxisId="left" dataKey="checkins" name="チェックイン" fill="var(--point)" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="right" dataKey="gdp" name="GDP" fill="var(--chip)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopList title="チップ保有 TOP10" entries={data.topChip} unit="chip" />
        <TopList title="ポイント保有 TOP10" entries={data.topPoint} unit="pt" />
      </div>
    </div>
  );
}
