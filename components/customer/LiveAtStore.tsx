"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AvatarImage } from "./AvatarImage";
import { Users, RefreshCw } from "lucide-react";

interface User {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  rankName: string | null;
  totalVisitCount: number;
  checkedInAt: string;
}

interface Data {
  users: User[];
  count: number;
  myId: string;
}

function fmtTimeJST(iso: string) {
  return new Date(iso).toLocaleTimeString("ja-JP", {
    timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

export function LiveAtStore() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/store/live");
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    // refresh every 60s
    const id = setInterval(fetchData, 60_000);
    return () => clearInterval(id);
  }, [fetchData]);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="label-gaming">live @ store</p>
          {data && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: data.count > 0 ? "#4ade80" : "var(--muted-foreground)" }} />
                <span className="relative inline-flex rounded-full h-2 w-2"
                  style={{ background: data.count > 0 ? "#4ade80" : "var(--muted-foreground)" }} />
              </span>
              <span className="text-[11px] font-bold" style={{ color: data.count > 0 ? "#4ade80" : "var(--muted-foreground)" }}>
                {data.count}人 在店中
              </span>
            </div>
          )}
        </div>
        <button onClick={fetchData} disabled={loading} className="text-muted-foreground hover:text-foreground">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {data && data.count === 0 ? (
        <div className="card-elevated rounded-xl p-5 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Users size={14} />
          まだ誰もチェックインしていません
        </div>
      ) : data ? (
        <div className="card-elevated rounded-xl overflow-hidden">
          <div className="flex overflow-x-auto no-scrollbar p-3 gap-3">
            {data.users.map((u, idx) => (
              <Link
                key={u.id}
                href={`/profile/${u.id}`}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 w-16 group"
              >
                <div
                  className="relative"
                  style={{
                    animation: `float ${3.5 + (idx % 3) * 0.7}s ease-in-out infinite`,
                    animationDelay: `${idx * 0.3}s`,
                  }}
                >
                  <div
                    className="rounded-full"
                    style={{
                      boxShadow: u.id === data.myId
                        ? "0 0 16px oklch(0.65 0.26 22 / 55%), 0 0 32px oklch(0.55 0.26 22 / 25%)"
                        : "0 4px 12px rgba(0,0,0,0.35)",
                    }}
                  >
                    <AvatarImage userId={u.id} nickname={u.nickname} size={56} />
                  </div>
                  {/* Online indicator */}
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center"
                    style={{ background: "#4ade80", borderColor: "var(--background)" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white opacity-80 animate-pulse" />
                  </span>
                  {u.id === data.myId && (
                    <span className="absolute -top-1 -left-1 text-[8px] font-black px-1 py-0.5 rounded text-white"
                      style={{ background: "var(--primary)", boxShadow: "0 0 8px oklch(0.65 0.26 22 / 75%)" }}>
                      YOU
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-bold text-center truncate w-full leading-tight group-hover:text-primary transition-colors">
                  {u.nickname}
                </p>
                <p className="text-[9px] font-mono text-muted-foreground">{fmtTimeJST(u.checkedInAt)}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="card-elevated rounded-xl p-5 text-center text-xs text-muted-foreground">
          読み込み中...
        </div>
      )}
    </div>
  );
}
