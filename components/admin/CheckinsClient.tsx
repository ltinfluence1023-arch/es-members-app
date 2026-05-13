"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatBusinessDate } from "@/lib/utils/businessDay";
import { RefreshCw, ChevronLeft, ChevronRight, ChevronRight as ArrowRight } from "lucide-react";

interface Visit {
  id: string;
  user_id: string;
  nickname: string;
  rankName: string | null;
  visitCount: number;
  birthday: string | null;
  checked_in_at: string;
  bonus_chip: number;
}

interface ChipFlow {
  transfer: number;
  adminGrant: number;
  adminReduction: number;
  checkin: number;
  gdp: number;
}

interface ApiResponse {
  visits: Visit[];
  start: string;
  end: string;
  flow?: ChipFlow;
}

function fmtTime(iso: string) {
  // Format in JST regardless of viewer timezone
  return new Date(iso).toLocaleTimeString("ja-JP", {
    timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function fmtBirthday(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function dateLabel(iso: string | null, offset: number) {
  if (!iso) return "";
  const start = new Date(iso);
  const labelDate = new Date(start.getTime() + 6 * 3600 * 1000); // mid-business-day
  const jstDate = new Date(labelDate.getTime() + 9 * 3600 * 1000);
  const y = jstDate.getUTCFullYear();
  const m = String(jstDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jstDate.getUTCDate()).padStart(2, "0");
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  const dow = dayNames[jstDate.getUTCDay()];
  const label = `${y}/${m}/${d} (${dow})`;
  if (offset === 0) return `${label} — 本日`;
  if (offset === 1) return `${label} — 昨日`;
  return label;
}

export function CheckinsClient({ initialData }: { initialData: ApiResponse }) {
  const [data, setData] = useState<ApiResponse>(initialData);
  const [daysAgo, setDaysAgo] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchData = useCallback(async (offset: number) => {
    setLoading(true);
    try {
      const url = offset === 0
        ? "/api/admin/checkins"
        : `/api/admin/checkins?date=${getDateParam(offset)}`;
      const res = await fetch(url);
      const json: ApiResponse = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  // Supabase realtime — only for today
  useEffect(() => {
    if (daysAgo !== 0) return;

    const supabase = createClient();
    const channel = supabase
      .channel("admin-checkins-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "visits" },
        () => {
          // Re-fetch today's data when new check-in arrives
          fetchData(0);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [daysAgo, fetchData]);

  useEffect(() => {
    fetchData(daysAgo);
  }, [daysAgo, fetchData]);

  function getDateParam(offset: number): string {
    const now = new Date();
    // Get JST date
    const jstNow = new Date(now.getTime() + 9 * 3600 * 1000);
    const target = new Date(jstNow);
    target.setUTCDate(target.getUTCDate() - offset);
    // If current JST hour < 6, business day date is previous calendar day
    const jstHour = (now.getUTCHours() + 9) % 24;
    if (jstHour < 6 && offset === 0) {
      target.setUTCDate(target.getUTCDate() - 1);
    }
    return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(target.getUTCDate()).padStart(2, "0")}`;
  }

  const visits = data.visits ?? [];

  return (
    <div className="space-y-4">
      {/* Date nav + refresh */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDaysAgo((d) => d + 1)}
            className="p-1.5 rounded-lg border border-border hover:bg-muted/40 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold min-w-[200px] text-center">
            {dateLabel(data.start, daysAgo)}
          </span>
          <button
            onClick={() => setDaysAgo((d) => Math.max(0, d - 1))}
            disabled={daysAgo === 0}
            className="p-1.5 rounded-lg border border-border hover:bg-muted/40 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {daysAgo === 0 && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: "var(--point)" }} />
                <span className="relative inline-flex rounded-full h-2 w-2"
                  style={{ background: "var(--point)" }} />
              </span>
              <span className="text-xs text-muted-foreground">リアルタイム</span>
            </div>
          )}
          <button
            onClick={() => fetchData(daysAgo)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            {lastUpdated.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">チェックイン数</p>
          <p className="text-2xl font-black" style={{ color: "var(--primary)" }}>
            {visits.length}<span className="text-sm font-normal text-muted-foreground ml-1">人</span>
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 col-span-1">
          <p className="text-xs text-muted-foreground mb-1">GDP（ユーザー間送付）</p>
          <p className="text-2xl font-black" style={{ color: "var(--chip)" }}>
            {(data.flow?.gdp ?? 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">トランスファーのチップ移動量</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 col-span-2 lg:col-span-1">
          <p className="text-xs text-muted-foreground mb-2">内訳</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">送付</span>
              <span className="font-mono font-bold">{(data.flow?.transfer ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">手動付与</span>
              <span className="font-mono font-bold">{(data.flow?.adminGrant ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">チェックイン</span>
              <span className="font-mono font-bold">{(data.flow?.checkin ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">手動減算</span>
              <span className="font-mono font-bold" style={{ color: "var(--destructive)" }}>
                -{(data.flow?.adminReduction ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground font-mono">
        集計期間: {data.start ? formatBusinessDate(new Date(data.start)) : "—"} 06:00 〜 翌 05:59
      </p>

      {/* Check-in list */}
      {visits.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          チェックインがありません
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="py-2.5 px-4 text-left text-xs text-muted-foreground font-medium">時刻</th>
                <th className="py-2.5 px-4 text-left text-xs text-muted-foreground font-medium">ニックネーム</th>
                <th className="py-2.5 px-4 text-left text-xs text-muted-foreground font-medium">ランク</th>
                <th className="py-2.5 px-4 text-left text-xs text-muted-foreground font-medium hidden md:table-cell">生年月日</th>
                <th className="py-2.5 px-4 text-right text-xs text-muted-foreground font-medium">来店回数</th>
                <th className="py-2.5 px-4 text-right text-xs text-muted-foreground font-medium">ボーナスチップ</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors group cursor-pointer">
                  <td className="py-3 px-4 font-mono text-sm">
                    <Link href={`/admin/customers/${v.user_id}`} className="block">{fmtTime(v.checked_in_at)}</Link>
                  </td>
                  <td className="py-3 px-4 font-medium">
                    <Link href={`/admin/customers/${v.user_id}`} className="block group-hover:text-primary transition-colors">
                      {v.nickname}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">
                    <Link href={`/admin/customers/${v.user_id}`} className="block">{v.rankName ?? "—"}</Link>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs font-mono hidden md:table-cell">
                    <Link href={`/admin/customers/${v.user_id}`} className="block">{fmtBirthday(v.birthday)}</Link>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold" style={{ color: "var(--primary)" }}>
                    <Link href={`/admin/customers/${v.user_id}`} className="block">
                      {v.visitCount}<span className="text-xs font-normal text-muted-foreground ml-0.5">回</span>
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link href={`/admin/customers/${v.user_id}`} className="flex items-center justify-end gap-2 font-mono font-bold" style={{ color: "var(--chip)" }}>
                      +{v.bonus_chip}
                      <ArrowRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
