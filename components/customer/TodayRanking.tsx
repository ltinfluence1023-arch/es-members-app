"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown } from "lucide-react";
import { AvatarImage } from "./AvatarImage";

interface Entry {
  rank: number;
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  rankName: string | null;
  value: number;
}

interface Data {
  ranking: Entry[];
  myRank: Entry | null;
  businessDayStart: string;
}

export function TodayRanking({ myId }: { myId: string }) {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    fetch("/api/ranking/today")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="card-elevated rounded-2xl p-4 text-center">
        <p className="text-xs text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  const top = data.ranking;
  const myRow = data.myRank && !top.find((r) => r.userId === myId) ? data.myRank : null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="label-gaming">today's ranking</p>
        <Link href="/ranking" className="text-[11px] text-muted-foreground hover:text-foreground">
          全ランキング →
        </Link>
      </div>

      {top.length === 0 ? (
        <div className="card-elevated rounded-xl p-6 text-center text-xs text-muted-foreground">
          本日まだ動きがありません
        </div>
      ) : (
        <div className="card-elevated rounded-xl overflow-hidden">
          {top.map((e) => (
            <RankRow key={e.userId} e={e} highlight={e.userId === myId} />
          ))}
          {myRow && (
            <>
              <div className="text-center text-[10px] text-muted-foreground py-1">・・・</div>
              <RankRow e={myRow} highlight />
            </>
          )}
        </div>
      )}
    </div>
  );
}

const RANK_MEDAL: Record<number, string> = { 1: "👑", 2: "🥈", 3: "🥉" };

function RankRow({ e, highlight }: { e: Entry; highlight: boolean }) {
  const positive = e.value > 0;
  const isTop = e.rank <= 3;
  const rankColor =
    e.rank === 1 ? "#FFD700" :
    e.rank === 2 ? "#C8C8D0" :
    e.rank === 3 ? "#E0935A" :
    "var(--muted-foreground)";

  const rowBg =
    e.rank === 1 ? "linear-gradient(90deg, oklch(0.18 0.04 55 / 30%) 0%, transparent 100%)" :
    highlight    ? "oklch(0.65 0.26 22 / 12%)" :
    undefined;

  return (
    <Link
      href={`/profile/${e.userId}`}
      className="flex items-center gap-3 px-3.5 py-2.5 border-b border-border last:border-0 transition-colors"
      style={{
        background: rowBg,
        borderLeft: highlight ? "3px solid var(--primary)" : undefined,
      }}
    >
      {/* Rank indicator */}
      <div className="w-7 flex-shrink-0 flex flex-col items-center gap-0.5">
        {isTop ? (
          <span className="text-base leading-none" style={{ filter: `drop-shadow(0 0 6px ${rankColor})` }}>
            {RANK_MEDAL[e.rank]}
          </span>
        ) : (
          <span
            className="text-sm font-black tabular-nums"
            style={{ color: rankColor }}
          >
            {e.rank}
          </span>
        )}
      </div>

      <AvatarImage userId={e.userId} nickname={e.nickname} src={e.avatarUrl} size={36} />

      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold leading-tight truncate"
          style={{ color: e.rank === 1 ? "#FFE97A" : undefined }}>
          {e.nickname}<span className="text-xs text-muted-foreground font-normal ml-0.5">様</span>
        </p>
        {e.rankName && <p className="text-[10px] text-muted-foreground">{e.rankName}</p>}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {positive ? (
          <TrendingUp size={12} style={{ color: "var(--chip)" }} />
        ) : (
          <TrendingDown size={12} style={{ color: "var(--destructive)" }} />
        )}
        <span
          className="text-[15px] font-black font-mono tabular-nums"
          style={{
            color: positive ? "var(--chip)" : "var(--destructive)",
            textShadow: positive ? "0 0 12px oklch(0.65 0.26 22 / 60%)" : undefined,
          }}
        >
          {positive ? "+" : ""}{e.value.toLocaleString()}
        </span>
      </div>
    </Link>
  );
}
