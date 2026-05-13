"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

interface DataPoint {
  date: string;   // "04/20"
  balance: number;
}

interface Props {
  data: DataPoint[];
  currentBalance: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border px-3 py-2 text-xs"
      style={{ background: "oklch(0.13 0.008 260)" }}>
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="font-black font-mono" style={{ color: "var(--chip)" }}>
        {payload[0].value.toLocaleString()} chip
      </p>
    </div>
  );
}

export function ChipBalanceChart({ data, currentBalance }: Props) {
  if (data.length < 2) {
    return (
      <div className="card-gaming rounded-xl p-6 text-center text-xs text-muted-foreground">
        グラフを表示するにはもっと取引が必要です
      </div>
    );
  }

  const values = data.map((d) => d.balance);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const isFlat = minVal === maxVal;

  return (
    <div className="card-gaming rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">
          Balance Chart
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">現在</span>
          <span className="text-sm font-black font-mono" style={{ color: "var(--chip)" }}>
            {currentBalance.toLocaleString()}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="chipFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chip)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--chip)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 9, fill: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
            width={45}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
            domain={isFlat ? [minVal * 0.9, minVal * 1.1] : ["auto", "auto"]}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />
          {!isFlat && (
            <ReferenceLine
              y={values[0]}
              stroke="rgba(255,255,255,0.1)"
              strokeDasharray="4 4"
            />
          )}
          <Area
            type="monotone"
            dataKey="balance"
            stroke="var(--chip)"
            strokeWidth={2}
            fill="url(#chipFill)"
            dot={{ r: 2, fill: "var(--chip)", strokeWidth: 0 }}
            activeDot={{ r: 4, fill: "var(--chip)", strokeWidth: 2, stroke: "#fff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
