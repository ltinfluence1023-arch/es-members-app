"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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

const AVATAR_W = 56;
const AVATAR_H = 76; // avatar(48) + gap + nickname

// 背景パーティクル
const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  top:     `${((i * 19 + 7)  % 88) + 6}%`,
  left:    `${((i * 23 + 13) % 86) + 7}%`,
  size:    i % 6 === 0 ? 2 : 1,
  opacity: 0.08 + (i % 4) * 0.06,
  dur:     3.0 + (i % 3) * 0.9,
  delay:   (i * 0.28) % 3.5,
}));

// ────────────────────────────────────────────
// FloatingUser: 独立したタイミングで空間を漂う
// ────────────────────────────────────────────
function FloatingUser({
  u, isMe, index, containerW, containerH,
}: {
  u: User; isMe: boolean; index: number; containerW: number; containerH: number;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ロゴ中央を避けたランダム位置を生成
  const getPos = useCallback(() => {
    const padX = 8;
    const padY = 8;
    const maxX = containerW - AVATAR_W - padX * 2;
    const maxY = containerH - AVATAR_H - padY * 2;

    // ロゴ除外ゾーン（中央40%×50%）
    const lx1 = containerW * 0.28;
    const lx2 = containerW * 0.72;
    const ly1 = containerH * 0.22;
    const ly2 = containerH * 0.72;

    let x: number, y: number, tries = 0;
    do {
      x = padX + Math.random() * maxX;
      y = padY + Math.random() * maxY;
      tries++;
    } while (
      tries < 20 &&
      x + AVATAR_W > lx1 && x < lx2 &&
      y + AVATAR_H > ly1 && y < ly2
    );

    return { x, y };
  }, [containerW, containerH]);

  // 次の移動をスケジュール
  const scheduleMove = useCallback(() => {
    const delay = 3000 + Math.random() * 4000;
    timerRef.current = setTimeout(() => {
      setPos(getPos());
      scheduleMove();
    }, delay);
  }, [getPos]);

  useEffect(() => {
    if (!containerW || !containerH) return;

    // 初期位置（ユーザーごとにずらして登場）
    const initTimer = setTimeout(() => {
      setPos(getPos());
      scheduleMove();
    }, index * 180);

    return () => {
      clearTimeout(initTimer);
      clearTimeout(timerRef.current);
    };
  }, [containerW, containerH, getPos, scheduleMove, index]);

  if (!pos) return null;

  return (
    <Link
      href={`/profile/${u.id}`}
      className="absolute flex flex-col items-center gap-1 group"
      style={{
        left:       pos.x,
        top:        pos.y,
        width:      AVATAR_W,
        transition: "left 4s cubic-bezier(0.45, 0, 0.55, 1), top 4s cubic-bezier(0.45, 0, 0.55, 1)",
      }}
    >
      <div className="relative">
        {/* 自分のグロー */}
        {isMe && (
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: "-4px", borderRadius: "50%",
              boxShadow: "0 0 14px oklch(0.65 0.26 22 / 85%), 0 0 28px oklch(0.55 0.26 22 / 45%)",
              border: "1px solid oklch(0.65 0.26 22 / 55%)",
            }}
          />
        )}

        <div style={{
          borderRadius: "50%",
          boxShadow: isMe
            ? "0 0 16px oklch(0.65 0.26 22 / 50%), 0 4px 12px rgba(0,0,0,0.5)"
            : "0 4px 14px rgba(0,0,0,0.55)",
        }}>
          <AvatarImage userId={u.id} nickname={u.nickname} size={48} />
        </div>

        {/* オンラインドット */}
        <span
          className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 flex items-center justify-center"
          style={{ background: "#4ade80", borderColor: "oklch(0.07 0.012 22)" }}
        >
          <span className="w-1 h-1 rounded-full bg-white/80 animate-pulse" />
        </span>

        {/* YOU バッジ */}
        {isMe && (
          <span
            className="absolute -top-1 -left-1 text-[7px] font-black px-1 py-0.5 rounded text-white"
            style={{ background: "var(--primary)", boxShadow: "0 0 8px oklch(0.65 0.26 22 / 75%)" }}
          >
            YOU
          </span>
        )}
      </div>

      <p
        className="text-[10px] font-bold text-center leading-tight w-full truncate group-hover:text-white transition-colors"
        style={{
          color: isMe ? "rgba(255,200,200,0.9)" : "rgba(255,255,255,0.65)",
          textShadow: "0 1px 6px rgba(0,0,0,0.9)",
        }}
      >
        {u.nickname}
      </p>
    </Link>
  );
}

// ────────────────────────────────────────────
// メインコンポーネント
// ────────────────────────────────────────────
export function LiveAtStore() {
  const [data, setData]       = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const containerRef          = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/store/live");
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60_000);
    return () => clearInterval(id);
  }, [fetchData]);

  // コンテナサイズを測定
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setContainerSize({ w: width, h: height });
  }, []);

  const isEmpty = data?.count === 0;

  return (
    <div className="space-y-2.5">

      {/* ヘッダー */}
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
              <span className="text-[11px] font-bold"
                style={{ color: data.count > 0 ? "#4ade80" : "var(--muted-foreground)" }}>
                {data.count}人 在店中
              </span>
            </div>
          )}
        </div>
        <button onClick={fetchData} disabled={loading}
          className="text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* 空間コンテナ */}
      <div
        ref={containerRef}
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
        <div className="absolute pointer-events-none" style={{
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "240px", height: "140px",
          background: "radial-gradient(ellipse at center, oklch(0.22 0.035 22 / 40%) 0%, transparent 70%)",
          filter: "blur(24px)",
        }} />

        {/* 外縁ビネット */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background:
            "radial-gradient(ellipse 90% 80% at 50% 50%, transparent 55%, oklch(0.03 0.005 22 / 70%) 100%)",
        }} />

        {/* 浮遊パーティクル */}
        {PARTICLES.map((p, i) => (
          <div key={i} className="absolute rounded-full pointer-events-none" style={{
            top: p.top, left: p.left,
            width: p.size, height: p.size,
            background: "white", opacity: p.opacity,
            animation: `float ${p.dur}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }} />
        ))}

        {/* 中央ロゴ */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <div style={{ animation: "float 8s ease-in-out infinite", animationDelay: "0.4s" }}>
            <img
              src="/logo-white.png"
              alt="flair bar es"
              style={{
                width: "155px", height: "155px",
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
            <p className="text-[11px] font-medium tracking-widest"
              style={{ color: "rgba(255,255,255,0.28)" }}>
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

        {/* 浮遊ユーザー */}
        {containerSize.w > 0 && data?.users.map((u, idx) => (
          <FloatingUser
            key={u.id}
            u={u}
            isMe={u.id === data.myId}
            index={idx}
            containerW={containerSize.w}
            containerH={containerSize.h}
          />
        ))}
      </div>
    </div>
  );
}
