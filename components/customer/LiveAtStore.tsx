"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AvatarImage } from "./AvatarImage";
import { RefreshCw } from "lucide-react";

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

// ユーザーが浮遊するオービット位置（ロゴ中央を避けた配置）
const ORBITS = [
  { top: "5%",  left: "4%",  dur: 3.8, delay: 0.0 },
  { top: "3%",  left: "40%", dur: 4.2, delay: 0.7 },
  { top: "5%",  left: "76%", dur: 3.6, delay: 1.4 },
  { top: "42%", left: "1%",  dur: 4.0, delay: 0.3 },
  { top: "40%", left: "82%", dur: 3.7, delay: 1.1 },
  { top: "72%", left: "6%",  dur: 4.3, delay: 0.9 },
  { top: "74%", left: "42%", dur: 3.9, delay: 0.5 },
  { top: "72%", left: "76%", dur: 4.1, delay: 1.6 },
  { top: "22%", left: "2%",  dur: 3.7, delay: 0.4 },
  { top: "20%", left: "82%", dur: 4.0, delay: 1.2 },
  { top: "60%", left: "2%",  dur: 3.9, delay: 0.8 },
  { top: "58%", left: "80%", dur: 4.2, delay: 1.5 },
];

// 背景の浮遊パーティクル
const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  top:     `${((i * 19 + 7)  % 88) + 6}%`,
  left:    `${((i * 23 + 13) % 86) + 7}%`,
  size:    i % 6 === 0 ? 2 : 1,
  opacity: 0.08 + (i % 4) * 0.06,
  dur:     3.0 + (i % 3) * 0.9,
  delay:   (i * 0.28) % 3.5,
}));

export function LiveAtStore() {
  const [data, setData]       = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/store/live");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60_000);
    return () => clearInterval(id);
  }, [fetchData]);

  const isEmpty = data?.count === 0;

  return (
    <div className="space-y-2.5">

      {/* セクションヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="label-gaming">live @ store</p>
          {data && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: data.count > 0 ? "#4ade80" : "var(--muted-foreground)" }}
                />
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ background: data.count > 0 ? "#4ade80" : "var(--muted-foreground)" }}
                />
              </span>
              <span
                className="text-[11px] font-bold"
                style={{ color: data.count > 0 ? "#4ade80" : "var(--muted-foreground)" }}
              >
                {data.count}人 在店中
              </span>
            </div>
          )}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* 空間コンテナ */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          height: "300px",
          background:
            "radial-gradient(ellipse 75% 65% at 50% 50%, oklch(0.15 0.022 22) 0%, oklch(0.08 0.014 22) 60%, oklch(0.05 0.008 22) 100%)",
          border: "1px solid oklch(1 0 0 / 9%)",
          boxShadow: "inset 0 0 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* 中央グロー */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: "240px", height: "140px",
            background:
              "radial-gradient(ellipse at center, oklch(0.22 0.035 22 / 40%) 0%, transparent 70%)",
            filter: "blur(24px)",
          }}
        />

        {/* 外縁ビネット */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 90% 80% at 50% 50%, transparent 55%, oklch(0.03 0.005 22 / 70%) 100%)",
          }}
        />

        {/* 浮遊パーティクル */}
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              top: p.top, left: p.left,
              width:   p.size,
              height:  p.size,
              background: "white",
              opacity: p.opacity,
              animation: `float ${p.dur}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}

        {/* 中央ロゴ — ふわふわ浮遊 + グロー呼吸 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <div style={{ animation: "float 8s ease-in-out infinite", animationDelay: "0.4s" }}>
            <img
              src="/logo-white.png"
              alt="flair bar es"
              style={{
                width: "155px",
                height: "155px",
                objectFit: "contain",
                opacity: isEmpty ? 0.55 : 0.22,
                animation: "logo-breathe 5s ease-in-out infinite",
                animationDelay: "1s",
              }}
            />
          </div>
        </div>

        {/* 空の状態 */}
        {isEmpty && (
          <div className="absolute inset-0 flex items-end justify-center pb-5 pointer-events-none">
            <p
              className="text-[11px] font-medium tracking-widest"
              style={{ color: "rgba(255,255,255,0.28)" }}
            >
              まだ誰もいません
            </p>
          </div>
        )}

        {/* 読み込み中 */}
        {!data && (
          <div className="absolute inset-0 flex items-end justify-center pb-5">
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.28)" }}>
              読み込み中...
            </p>
          </div>
        )}

        {/* 浮遊するユーザーアバター */}
        {data?.users.map((u, idx) => {
          const orbit = ORBITS[idx % ORBITS.length];
          const isMe  = u.id === data.myId;

          return (
            <Link
              key={u.id}
              href={`/profile/${u.id}`}
              className="absolute flex flex-col items-center gap-1 group"
              style={{
                top:   orbit.top,
                left:  orbit.left,
                animation: `float ${orbit.dur}s ease-in-out infinite`,
                animationDelay: `${orbit.delay}s`,
              }}
            >
              <div className="relative">
                {/* 自分のグロー */}
                {isMe && (
                  <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      inset: "-4px",
                      borderRadius: "50%",
                      boxShadow:
                        "0 0 14px oklch(0.65 0.26 22 / 85%), 0 0 28px oklch(0.55 0.26 22 / 45%)",
                      border: "1px solid oklch(0.65 0.26 22 / 55%)",
                    }}
                  />
                )}

                {/* 通常のオーラ（全員） */}
                <div
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    inset: "-2px",
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)",
                  }}
                />

                <div
                  style={{
                    borderRadius: "50%",
                    boxShadow: isMe
                      ? "0 0 16px oklch(0.65 0.26 22 / 50%), 0 4px 12px rgba(0,0,0,0.5)"
                      : "0 4px 14px rgba(0,0,0,0.55)",
                  }}
                >
                  <AvatarImage userId={u.id} nickname={u.nickname} size={48} />
                </div>

                {/* オンラインドット */}
                <span
                  className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 flex items-center justify-center"
                  style={{
                    background: "#4ade80",
                    borderColor: "oklch(0.07 0.012 22)",
                  }}
                >
                  <span className="w-1 h-1 rounded-full bg-white/80 animate-pulse" />
                </span>

                {/* YOU バッジ */}
                {isMe && (
                  <span
                    className="absolute -top-1 -left-1 text-[7px] font-black px-1 py-0.5 rounded text-white"
                    style={{
                      background: "var(--primary)",
                      boxShadow: "0 0 8px oklch(0.65 0.26 22 / 75%)",
                    }}
                  >
                    YOU
                  </span>
                )}
              </div>

              {/* ニックネーム */}
              <p
                className="text-[10px] font-bold text-center leading-tight max-w-[56px] truncate group-hover:text-white transition-colors"
                style={{
                  color: isMe ? "rgba(255,200,200,0.9)" : "rgba(255,255,255,0.65)",
                  textShadow: "0 1px 6px rgba(0,0,0,0.9)",
                }}
              >
                {u.nickname}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
