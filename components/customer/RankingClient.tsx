"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AvatarImage } from "@/components/customer/AvatarImage";

type RankTab =
  | "daily_chip" | "monthly_chip" | "yearly_chip"
  | "weekly_visit" | "monthly_visit" | "yearly_visit" | "total_visit"
  | "monthly_received" | "monthly_sent" | "total_chip";

interface RankEntry { rank: number; userId: string; nickname: string; value: number; unit?: string }
interface RankingData {
  ranking: RankEntry[];
  myRank: RankEntry | null;
  myId: string;
  period: { label: string; from: string; to: string };
  updatedAt: string;
}

type Category = "chip" | "visit" | "transfer";
const TABS: { key: RankTab; label: string; emoji: string; category: Category }[] = [
  // チップ増減
  { key: "daily_chip",       label: "本日",   emoji: "🔥", category: "chip" },
  { key: "monthly_chip",     label: "月間",   emoji: "🪙", category: "chip" },
  { key: "yearly_chip",      label: "年間",   emoji: "👑", category: "chip" },
  { key: "total_chip",       label: "現在保有", emoji: "💎", category: "chip" },
  // 来店
  { key: "weekly_visit",     label: "今週",   emoji: "📅", category: "visit" },
  { key: "monthly_visit",    label: "月間",   emoji: "🍷", category: "visit" },
  { key: "yearly_visit",     label: "年間",   emoji: "🌟", category: "visit" },
  { key: "total_visit",      label: "累計",   emoji: "🏆", category: "visit" },
  // 送受
  { key: "monthly_received", label: "月間獲得", emoji: "🎁", category: "transfer" },
  { key: "monthly_sent",     label: "月間送付", emoji: "💝", category: "transfer" },
];
const CATEGORIES: { key: Category; label: string }[] = [
  { key: "chip",     label: "チップ" },
  { key: "visit",    label: "来店" },
  { key: "transfer", label: "送受" },
];

const REFRESH_SEC = 30;

function RankBadge({ rank }: { rank: number }) {
  const gold   = rank === 1;
  const silver = rank === 2;
  const bronze = rank === 3;
  const bg = gold ? "linear-gradient(135deg,#f5c842,#c8962a)"
           : silver ? "linear-gradient(135deg,#c0c0c0,#7a7a7a)"
           : bronze ? "linear-gradient(135deg,#cd7f32,#7a3c00)"
           : undefined;
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
      style={{
        background: bg ?? "rgba(255,255,255,0.08)",
        boxShadow: gold ? "0 0 8px rgba(245,200,66,0.4)" : undefined,
      }}
    >
      <span className={`text-xs font-black tabular-nums ${gold || silver || bronze ? "text-white" : "text-white/60"}`}>
        {rank}
      </span>
    </div>
  );
}

interface RowProps {
  item: RankEntry;
  isSelf: boolean;
  unit: string;
  onClick: () => void;
}

function RankRow({ item, isSelf, unit, onClick }: RowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3.5 px-5 py-3.5 text-left transition-all duration-150 active:opacity-70 hover:bg-white/[0.03]"
      style={isSelf ? { borderLeft: "3px solid var(--primary)", background: "oklch(0.65 0.24 22 / 0.07)" } : { borderLeft: "3px solid transparent" }}
    >
      <RankBadge rank={item.rank} />
      <AvatarImage userId={item.userId} nickname={item.nickname} size={44} />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold truncate leading-tight">
          {item.nickname}
          <span className="text-[12px] text-muted-foreground font-normal ml-1">様</span>
        </p>
        {isSelf && (
          <p className="text-[10px] font-bold tracking-widest uppercase mt-0.5" style={{ color: "var(--primary)" }}>
            あなた
          </p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <span className="text-base font-black tabular-nums text-white/90">
          {item.value.toLocaleString()}
        </span>
        {unit && <span className="text-[11px] text-muted-foreground ml-1">{unit}</span>}
      </div>
    </button>
  );
}

export function RankingClient({ myId }: { myId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams.get("tab") ?? "monthly_chip") as RankTab;

  const [data, setData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(REFRESH_SEC);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (tab: RankTab) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ranking/data?tab=${tab}`);
      const json = await res.json();
      setData(json);
      setCountdown(REFRESH_SEC);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(activeTab);
    if (timerRef.current) clearInterval(timerRef.current);
    if (countRef.current) clearInterval(countRef.current);
    timerRef.current = setInterval(() => fetchData(activeTab), REFRESH_SEC * 1000);
    setCountdown(REFRESH_SEC);
    countRef.current = setInterval(() => setCountdown((c) => (c <= 1 ? REFRESH_SEC : c - 1)), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countRef.current) clearInterval(countRef.current);
    };
  }, [activeTab, fetchData]);

  const activeInfo = TABS.find((t) => t.key === activeTab) ?? TABS[0];
  const activeCategory = activeInfo.category;
  const tabsInCategory = TABS.filter((t) => t.category === activeCategory);
  const myEntry = data?.ranking.find((r) => r.userId === myId) ?? data?.myRank ?? null;
  const myInTop = data?.ranking.some((r) => r.userId === myId) ?? false;

  return (
    <div className="px-4 py-5 space-y-4 animate-page-in">

      {/* My rank header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="label-gaming mb-1">My Rank</p>
          <p className="text-4xl font-black"
            style={{
              color: "var(--primary)",
              textShadow: "0 0 16px oklch(0.65 0.26 22 / 60%), 0 0 32px oklch(0.55 0.26 22 / 30%)",
            }}>
            {myEntry
              ? <>{myEntry.rank}<span className="text-lg text-muted-foreground font-bold ml-1">位</span></>
              : <span className="text-2xl text-muted-foreground">ランク外</span>}
          </p>
          {data && (
            <p className="text-[12px] text-muted-foreground font-mono mt-1.5">
              {new Date(data.updatedAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} 更新
            </p>
          )}
        </div>
        {/* Live dot */}
        <div className="flex items-center gap-1.5 mb-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--point)" }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--point)" }} />
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">{countdown}s</span>
        </div>
      </div>

      {/* Category */}
      <div className="flex gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => router.push(`/ranking?tab=${TABS.find((t) => t.category === c.key)?.key ?? "monthly_chip"}`)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-black tracking-wide transition-all border-2 ${
              activeCategory === c.key ? "text-white border-primary" : "text-muted-foreground border-border"
            }`}
            style={activeCategory === c.key ? {
              background: "var(--primary)",
              boxShadow: "0 0 14px oklch(0.65 0.26 22 / 45%)",
            } : undefined}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Sub-tabs within category */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {tabsInCategory.map((t) => (
          <button
            key={t.key}
            onClick={() => router.push(`/ranking?tab=${t.key}`)}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide transition-colors interactive ${
              activeTab === t.key ? "text-white" : "text-muted-foreground border border-border"
            }`}
            style={activeTab === t.key ? { background: "var(--primary)" } : undefined}
          >
            <span>{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Period */}
      {data && (
        <div className="flex items-center justify-between px-1">
          <p className="text-[13px] font-bold">{data.period.label}</p>
          {data.period.from !== "—" && (
            <p className="text-[11px] font-mono text-muted-foreground">{data.period.from} 〜 {data.period.to}</p>
          )}
        </div>
      )}

      {/* Ranking list */}
      {loading && !data ? (
        <div className="card-elevated rounded-2xl p-10 text-center text-sm text-muted-foreground">読み込み中...</div>
      ) : !data || data.ranking.length === 0 ? (
        <div className="card-elevated rounded-2xl p-10 text-center text-sm text-muted-foreground">データがありません</div>
      ) : (
        <div className="card-elevated rounded-2xl overflow-hidden">
          {data.ranking.map((item, i) => (
            <div key={item.userId}>
              {i > 0 && <div className="mx-5 h-px bg-border/50" />}
              <RankRow
                item={item}
                isSelf={item.userId === myId}
                unit={item.unit ?? ""}
                onClick={() => router.push(`/profile/${item.userId}`)}
              />
            </div>
          ))}

          {/* My rank if outside top 20 */}
          {data.myRank && !myInTop && (
            <>
              <div className="mx-5 h-px bg-border/50" />
              <div className="px-5 py-2 text-center">
                <span className="text-[10px] text-muted-foreground tracking-widest">・・・</span>
              </div>
              <div className="mx-5 h-px bg-border/50" />
              <RankRow
                item={data.myRank}
                isSelf={true}
                unit={data.myRank.unit ?? ""}
                onClick={() => router.push(`/profile/${data.myRank!.userId}`)}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
