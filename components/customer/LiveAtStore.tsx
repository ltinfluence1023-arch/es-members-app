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

// ────────────────────────────────────────────────────────────
// Lissajous曲線パラメータ
//   x(t) = bx*W + ax*sin(wx*t + px)
//   y(t) = by*H + ay*sin(wy*t + py)
//   wx と wy の比が無理数 → 同じ軌跡を二度と通らない有機的な動き
//   角速度 0.3〜0.7 rad/s ≈ 周期 9〜21秒 → ゆっくり
// ────────────────────────────────────────────────────────────
const WANDER = [
  { bx: 0.15, by: 0.18, ax: 62, ay: 46, wx: 0.40, wy: 0.61, px: 0.00, py: 0.80 }, // 左上
  { bx: 0.82, by: 0.15, ax: 56, ay: 48, wx: 0.55, wy: 0.38, px: 1.20, py: 0.30 }, // 右上
  { bx: 0.16, by: 0.82, ax: 58, ay: 44, wx: 0.45, wy: 0.68, px: 2.10, py: 1.40 }, // 左下
  { bx: 0.80, by: 0.80, ax: 54, ay: 47, wx: 0.62, wy: 0.43, px: 0.70, py: 1.90 }, // 右下
  { bx: 0.08, by: 0.47, ax: 34, ay: 68, wx: 0.35, wy: 0.52, px: 1.50, py: 0.50 }, // 左辺
  { bx: 0.89, by: 0.50, ax: 32, ay: 64, wx: 0.52, wy: 0.35, px: 0.40, py: 1.60 }, // 右辺
  { bx: 0.47, by: 0.07, ax: 82, ay: 30, wx: 0.42, wy: 0.67, px: 1.80, py: 1.10 }, // 上辺
  { bx: 0.50, by: 0.88, ax: 78, ay: 28, wx: 0.58, wy: 0.42, px: 0.90, py: 0.40 }, // 下辺
  { bx: 0.12, by: 0.36, ax: 44, ay: 52, wx: 0.48, wy: 0.72, px: 2.40, py: 0.20 }, // 左中
  { bx: 0.86, by: 0.35, ax: 40, ay: 56, wx: 0.66, wy: 0.45, px: 0.60, py: 2.10 }, // 右中
  { bx: 0.14, by: 0.66, ax: 48, ay: 44, wx: 0.38, wy: 0.60, px: 1.20, py: 0.90 }, // 左下中
  { bx: 0.84, by: 0.68, ax: 44, ay: 50, wx: 0.60, wy: 0.37, px: 1.80, py: 1.50 }, // 右下中
];

// 背景パーティクル
const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  top:     `${((i * 19 + 7)  % 88) + 6}%`,
  left:    `${((i * 23 + 13) % 86) + 7}%`,
  size:    i % 6 === 0 ? 2 : 1,
  opacity: 0.08 + (i % 4) * 0.06,
  dur:     3.0 + (i % 3) * 0.9,
  delay:   (i * 0.28) % 3.5,
}));

// ────────────────────────────────────────────────────────────
// FloatingUser — RAF で常時なめらかに移動
// ────────────────────────────────────────────────────────────
function FloatingUser({
  u, isMe, index, containerW, containerH,
}: {
  u: User; isMe: boolean; index: number; containerW: number; containerH: number;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rafRef     = useRef<number>(0);

  useEffect(() => {
    if (!containerW || !containerH || !wrapperRef.current) return;

    const p      = WANDER[index % WANDER.length];
    const startT = performance.now();

    const clamp = (v: number, lo: number, hi: number) =>
      Math.max(lo, Math.min(hi, v));

    const tick = (now: number) => {
      const t = (now - startT) / 1000; // 秒

      const x = clamp(
        p.bx * containerW + p.ax * Math.sin(p.wx * t + p.px) - AVATAR_W / 2,
        4,
        containerW - AVATAR_W - 4,
      );
      const y = clamp(
        p.by * containerH + p.ay * Math.sin(p.wy * t + p.py) - AVATAR_H / 2,
        4,
        containerH - AVATAR_H - 4,
      );

      if (wrapperRef.current) {
        wrapperRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [containerW, containerH, index]);

  return (
    <div
      ref={wrapperRef}
      className="absolute top-0 left-0"
      style={{ willChange: "transform" }}
    >
      <Link
        href={`/profile/${u.id}`}
        className="flex flex-col items-center gap-1 group"
        style={{ width: AVATAR_W }}
      >
        <div className="relative">
          {/* 自分のグロー */}
          {isMe && (
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                inset: "-4px", borderRadius: "50%",
                boxShadow:
                  "0 0 14px oklch(0.65 0.26 22 / 85%), 0 0 28px oklch(0.55 0.26 22 / 45%)",
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
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// メインコンポーネント
// ────────────────────────────────────────────────────────────
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

        {/* 常時移動するユーザーアイコン */}
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
