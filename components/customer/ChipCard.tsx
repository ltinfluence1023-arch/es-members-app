"use client";

import { useState } from "react";
import { type AchievementRankKey, getRankStyleByKey } from "@/lib/utils/achievementRank";

interface RankStyle {
  gradient: string;
  glow: string;
  label: string;
  accentColor: string;
  pattern: string;
  accentLine: string;
}

function getRankStyle(rankName: string | null | undefined): RankStyle {
  const name = (rankName ?? "").toLowerCase();

  if (name.includes("platinum") || name.includes("プラチナ")) {
    return {
      gradient: "linear-gradient(135deg, #0f0608 0%, #2a0d14 30%, #8b1a2e 52%, #2a0d14 78%, #0f0608 100%)",
      glow: "0 0 48px rgba(200,30,70,0.45), 0 10px 36px rgba(0,0,0,0.72), 0 2px 4px rgba(0,0,0,0.5)",
      label: "PLATINUM",
      accentColor: "#ff6080",
      pattern: "radial-gradient(ellipse at 76% 22%, rgba(220,40,80,0.22) 0%, transparent 55%), radial-gradient(ellipse at 22% 78%, rgba(140,15,35,0.16) 0%, transparent 46%)",
      accentLine: "linear-gradient(90deg, transparent 0%, rgba(255,100,130,0.7) 40%, rgba(255,80,110,0.9) 60%, transparent 100%)",
    };
  }
  if (name.includes("gold") || name.includes("ゴールド") || name.includes("金")) {
    return {
      gradient: "linear-gradient(135deg, #140400 0%, #3a1000 28%, #aa2e08 52%, #3a1000 78%, #140400 100%)",
      glow: "0 0 42px rgba(200,70,15,0.48), 0 10px 34px rgba(0,0,0,0.70), 0 2px 4px rgba(0,0,0,0.5)",
      label: "GOLD",
      accentColor: "#ff7040",
      pattern: "radial-gradient(ellipse at 76% 22%, rgba(200,70,15,0.24) 0%, transparent 55%), radial-gradient(ellipse at 22% 78%, rgba(130,25,5,0.16) 0%, transparent 46%)",
      accentLine: "linear-gradient(90deg, transparent 0%, rgba(255,100,50,0.7) 40%, rgba(255,80,30,0.9) 60%, transparent 100%)",
    };
  }
  if (name.includes("silver") || name.includes("シルバー") || name.includes("銀")) {
    return {
      gradient: "linear-gradient(135deg, #0e0508 0%, #200c12 30%, #5a1e2c 52%, #200c12 78%, #0e0508 100%)",
      glow: "0 0 34px rgba(160,30,60,0.40), 0 10px 30px rgba(0,0,0,0.70), 0 2px 4px rgba(0,0,0,0.5)",
      label: "SILVER",
      accentColor: "#e08090",
      pattern: "radial-gradient(ellipse at 76% 22%, rgba(160,40,70,0.20) 0%, transparent 55%), radial-gradient(ellipse at 22% 78%, rgba(100,20,40,0.14) 0%, transparent 46%)",
      accentLine: "linear-gradient(90deg, transparent 0%, rgba(200,80,100,0.6) 40%, rgba(200,60,90,0.85) 60%, transparent 100%)",
    };
  }
  if (name.includes("bronze") || name.includes("ブロンズ") || name.includes("銅")) {
    return {
      gradient: "linear-gradient(135deg, #0c0405 0%, #1c0a09 30%, #481510 52%, #1c0a09 78%, #0c0405 100%)",
      glow: "0 0 28px rgba(140,30,20,0.38), 0 10px 26px rgba(0,0,0,0.68), 0 2px 4px rgba(0,0,0,0.5)",
      label: "BRONZE",
      accentColor: "#d07060",
      pattern: "radial-gradient(ellipse at 76% 22%, rgba(140,40,30,0.20) 0%, transparent 55%), radial-gradient(ellipse at 22% 78%, rgba(90,20,15,0.14) 0%, transparent 46%)",
      accentLine: "linear-gradient(90deg, transparent 0%, rgba(180,60,50,0.6) 40%, rgba(180,50,40,0.85) 60%, transparent 100%)",
    };
  }

  return {
    gradient: "linear-gradient(135deg, #0d0507 0%, #1b0b10 35%, #2c1016 65%, #1b0b10 100%)",
    glow: "0 0 22px rgba(120,20,40,0.28), 0 8px 22px rgba(0,0,0,0.65), 0 2px 4px rgba(0,0,0,0.5)",
    label: "MEMBER",
    accentColor: "#e05070",
    pattern: "radial-gradient(ellipse at 76% 22%, rgba(180,30,60,0.14) 0%, transparent 55%), radial-gradient(ellipse at 22% 78%, rgba(100,15,30,0.10) 0%, transparent 46%)",
    accentLine: "linear-gradient(90deg, transparent 0%, rgba(160,40,70,0.5) 40%, rgba(160,30,60,0.75) 60%, transparent 100%)",
  };
}

interface Props {
  chipBalance: number;
  pointBalance: number;
  visitCount: number;
  nickname: string;
  avatarUrl?: string | null;
  rankName: string | null | undefined;
  userId: string;
  achievementRankKey?: AchievementRankKey;
  achievementPct?: number;
}

const RESERVATION_URL = "https://booking.ebica.jp/webrsv/vacant/e014040501/18515?isfixshop=true&affiid=glb";

export function ChipCard({ chipBalance, pointBalance, visitCount, nickname, avatarUrl, rankName, userId, achievementRankKey, achievementPct }: Props) {
  const [chips, setChips] = useState(chipBalance);
  const [points, setPoints] = useState(pointBalance);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  // アチーブメントランクがあれば優先、なければ来店数ランクにフォールバック
  const style = achievementRankKey
    ? { ...getRankStyleByKey(achievementRankKey), label: `${getRankStyleByKey(achievementRankKey).label} ${achievementPct ?? 0}%` }
    : getRankStyle(rankName);

  const memberId = `#${userId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/me/balance");
      if (res.ok) {
        const json = await res.json();
        setChips(json.chip_balance);
        setPoints(json.point_balance);
        setUpdatedAt(new Date());
      }
    } finally {
      setRefreshing(false);
    }
  }

  const timeStr = updatedAt
    ? `${String(updatedAt.getHours()).padStart(2, "0")}:${String(updatedAt.getMinutes()).padStart(2, "0")}`
    : null;

  return (
    <div className="space-y-2.5">
      <div
        className="relative rounded-2xl overflow-hidden w-full select-none card-hero"
        style={{
          background: style.gradient,
          boxShadow: style.glow,
          aspectRatio: "1.68 / 1",
          border: "1px solid rgba(255,255,255,0.14)",
        }}
      >
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: style.pattern }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%, rgba(255,255,255,0.02) 100%)" }} />

        {/* Animated shimmer sweep */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ borderRadius: "inherit" }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: "40%",
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.09) 50%, transparent 100%)",
              animation: "shimmer-sweep 4s ease-in-out infinite",
            }}
          />
        </div>

        {/* Animated top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: style.accentLine }} />

        {/* Subtle corner dot decoration */}
        <div className="absolute bottom-3 left-4 flex gap-1 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full"
              style={{ background: style.accentColor, opacity: 0.08 + i * 0.06 }} />
          ))}
        </div>

        {/* Content */}
        <div className="absolute inset-0 flex flex-col px-4 pt-3.5 pb-3">

          {/* Header: dots + rank */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5 items-center">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: style.accentColor,
                    opacity: 0.2 + i * 0.22,
                    boxShadow: i === 3 ? `0 0 6px ${style.accentColor}` : undefined,
                  }} />
              ))}
            </div>
            <span
              className="text-[9px] font-black tracking-[0.32em] uppercase px-2.5 py-1 rounded"
              style={{
                color: style.accentColor,
                background: `${style.accentColor}20`,
                border: `1px solid ${style.accentColor}40`,
                boxShadow: `0 0 10px ${style.accentColor}25, inset 0 1px 0 ${style.accentColor}15`,
              }}>
              {style.label}
            </span>
          </div>

          {/* Middle: nickname (left) + chip balance (right) */}
          <div className="flex-1 flex items-center justify-between gap-3 mt-2">
            {/* Left: User info */}
            <div className="flex items-center gap-2.5 min-w-0">
              {/* LINE アバター */}
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={nickname}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  style={{ border: `1.5px solid ${style.accentColor}60` }} />
              ) : (
                <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-black text-white text-base"
                  style={{ background: `${style.accentColor}30`, border: `1.5px solid ${style.accentColor}50` }}>
                  {(nickname || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[15px] font-bold tracking-[0.04em] leading-tight text-white/95 truncate">
                  {nickname || "—"}
                </p>
                <p className="text-[10px] font-mono tracking-[0.08em] mt-0.5"
                  style={{ color: "rgba(255,255,255,0.38)" }}>
                  {memberId}
                </p>
              </div>
            </div>
            {/* Right: Chip balance */}
            <div className="text-right flex-shrink-0">
              <p className="text-[8px] font-bold tracking-[0.30em] uppercase mb-1"
                style={{ color: "rgba(255,255,255,0.48)" }}>
                Chip
              </p>
              <div className="number-vivid">
                <p
                  className="font-black tabular-nums leading-none"
                  style={{
                    fontSize: "clamp(28px, 8.4vw, 44px)",
                    color: "#ffffff",
                    textShadow: `0 0 28px ${style.accentColor}70, 0 0 56px ${style.accentColor}30`,
                  }}
                >
                  {chips.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px w-full my-2.5"
            style={{ background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.18) 25%, rgba(255,255,255,0.18) 75%, transparent)` }} />

          {/* Bottom: Points + visit count + refresh */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-baseline gap-1">
                <span className="text-xs">💎</span>
                <span className="text-[14px] font-black tabular-nums text-white">
                  {points.toLocaleString()}
                </span>
                <span className="text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.48)" }}>PT</span>
              </div>
              <div className="w-px h-3.5" style={{ background: "rgba(255,255,255,0.18)" }} />
              <div className="flex items-baseline gap-1">
                <span className="text-xs">🍷</span>
                <span className="text-[14px] font-black tabular-nums text-white">
                  {visitCount.toLocaleString()}
                </span>
                <span className="text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.48)" }}>visit</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {timeStr && (
                <p className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.32)" }}>
                  {timeStr}
                </p>
              )}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  boxShadow: "0 0 8px rgba(255,255,255,0.06)",
                  opacity: refreshing ? 0.5 : 1,
                }}
                aria-label="残高更新"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                  fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  className={refreshing ? "animate-spin" : ""}>
                  <path d="M21 2v6h-6" />
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M3 22v-6h6" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* flair bar es mark */}
        <p className="absolute bottom-2 right-3.5 text-[7px] font-black tracking-[0.20em] lowercase pointer-events-none"
          style={{ color: style.accentColor, opacity: 0.40 }}>
          flair bar es
        </p>
      </div>

      {/* Reservation button */}
      <a
        href={RESERVATION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full rounded-2xl py-3.5 text-sm font-black text-white interactive"
        style={{
          background: `linear-gradient(135deg, ${style.accentColor}ee 0%, ${style.accentColor}99 100%)`,
          boxShadow: `0 6px 24px ${style.accentColor}45, 0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)`,
          letterSpacing: "0.05em",
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        ご予約はこちら
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ opacity: 0.75 }}>
          <path d="M7 17L17 7M7 7h10v10" />
        </svg>
      </a>
    </div>
  );
}
