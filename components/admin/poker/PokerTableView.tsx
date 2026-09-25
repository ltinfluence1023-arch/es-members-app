"use client";

import { Plus } from "lucide-react";
import { AvatarImage } from "@/components/customer/AvatarImage";
import type { PokerSeatState, PokerTableState } from "@/lib/admin/poker";

// 席の配置: 横長の楕円の上端中央をディーラー位置とし、P1 から時計回りに
// 外周の長さが等間隔になるよう並べる（角度で等分すると左右の端で席が詰まるため）
const RX = 46; // 横方向の半径（%）
const RY = 42; // 縦方向の半径（%）
const SAMPLES = 720;

function seatPositions(seatCount: number): { left: string; top: string }[] {
  // 上端（-90°）から時計回りに外周をサンプリングして累積長を求める
  const pts: { x: number; y: number; len: number }[] = [];
  let len = 0;
  for (let i = 0; i <= SAMPLES; i++) {
    const a = (-90 + (i * 360) / SAMPLES) * (Math.PI / 180);
    // 縦横比 16:10 を考慮して実寸に近い長さで計算する
    const x = RX * Math.cos(a) * 1.6;
    const y = RY * Math.sin(a);
    if (i > 0) len += Math.hypot(x - pts[i - 1].x, y - pts[i - 1].y);
    pts.push({ x, y, len });
  }
  const step = len / (seatCount + 1);
  return Array.from({ length: seatCount }, (_, i) => {
    const target = step * (i + 1);
    const p = pts.find((pt) => pt.len >= target) ?? pts[pts.length - 1];
    return { left: `${50 + p.x / 1.6}%`, top: `${50 + p.y}%` };
  });
}

export function PokerTableView({
  table,
  onSeatClick,
}: {
  table: PokerTableState;
  onSeatClick: (seatNo: number, seat: PokerSeatState | null) => void;
}) {
  const seatMap = new Map(table.seats.map((s) => [s.seatNo, s]));
  const positions = seatPositions(table.seatCount);
  const buyInTotal = table.seats.reduce((sum, s) => sum + s.withdrawTotal + s.purchaseTotal, 0);

  return (
    <div className="relative mx-auto w-full max-w-3xl aspect-[16/10] select-none">
      {/* レール */}
      <div
        className="absolute inset-x-[4%] inset-y-[8%] rounded-[50%]"
        style={{
          background: "linear-gradient(160deg, var(--rail-edge), var(--rail) 45%)",
          boxShadow: "var(--shadow-hero)",
        }}
      >
        {/* ラシャ */}
        <div
          className="absolute inset-x-[5%] inset-y-[9%] rounded-[50%] flex flex-col items-center justify-center text-center"
          style={{
            background: "radial-gradient(ellipse at center, var(--felt) 0%, var(--felt-edge) 100%)",
            boxShadow: "inset 0 0 40px rgba(0,0,0,0.55), 0 0 0 2px oklch(1 0 0 / 8%)",
          }}
        >
          <span className="text-[10px] font-black tracking-[0.3em] lowercase text-white/25">flair bar es</span>
          <span className="mt-1 text-base sm:text-lg font-bold text-white/90">{table.name}</span>
          <span className="mt-1 text-xs text-white/60">
            着席 {table.seats.length} / {table.seatCount}
          </span>
          {buyInTotal > 0 && (
            <span className="mt-2 rounded-full bg-black/30 px-3 py-1 text-[11px] font-mono text-white/80">
              持ち込み計 {buyInTotal.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* ディーラー */}
      <div
        className="absolute left-1/2 top-[8%] -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-[10px] font-black tracking-widest text-black"
        style={{ background: "oklch(0.92 0.02 90)", boxShadow: "0 2px 6px rgba(0,0,0,0.5)" }}
      >
        DEALER
      </div>

      {/* 席 */}
      {Array.from({ length: table.seatCount }, (_, i) => i + 1).map((seatNo) => {
        const seat = seatMap.get(seatNo) ?? null;
        const pos = positions[seatNo - 1];
        return (
          <button
            key={seatNo}
            type="button"
            onClick={() => onSeatClick(seatNo, seat)}
            className="absolute flex flex-col items-center gap-0.5 -translate-x-1/2 -translate-y-1/2 interactive"
            style={pos}
            aria-label={seat ? `P${seatNo} ${seat.user.nickname}` : `P${seatNo} 空席`}
          >
            {seat ? (
              <>
                <div key={seat.sessionId} className="relative rounded-full p-[2px] animate-scale-in" style={{ background: "var(--chip)" }}>
                  <AvatarImage userId={seat.user.id} nickname={seat.user.nickname} src={seat.user.avatar_url} size={40} />
                  <span className="absolute -right-1.5 -top-1 rounded-full bg-black px-1 text-[9px] font-bold text-white ring-1 ring-white/30">
                    P{seatNo}
                  </span>
                </div>
                <span className="max-w-[64px] truncate rounded bg-black/70 px-1.5 text-[10px] font-medium text-white">
                  {seat.user.nickname}
                </span>
              </>
            ) : (
              <>
                <div className="flex h-11 w-11 flex-col items-center justify-center rounded-full border-2 border-dashed border-white/30 bg-black/50 text-white/60">
                  <Plus size={14} />
                  <span className="text-[9px] font-bold leading-none">P{seatNo}</span>
                </div>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
