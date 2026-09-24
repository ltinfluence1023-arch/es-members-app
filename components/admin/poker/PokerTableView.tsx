"use client";

import { Plus } from "lucide-react";
import { AvatarImage } from "@/components/customer/AvatarImage";
import type { PokerSeatState, PokerTableState } from "@/lib/admin/poker";

// 席の配置: 楕円の上端（-90°）をディーラー位置とし、P1 から時計回りに等間隔で並べる
function seatPosition(seatNo: number, seatCount: number) {
  const angle = (-90 + (seatNo * 360) / (seatCount + 1)) * (Math.PI / 180);
  return {
    left: `${50 + 45 * Math.cos(angle)}%`,
    top: `${50 + 45 * Math.sin(angle)}%`,
  };
}

export function PokerTableView({
  table,
  onSeatClick,
}: {
  table: PokerTableState;
  onSeatClick: (seatNo: number, seat: PokerSeatState | null) => void;
}) {
  const seatMap = new Map(table.seats.map((s) => [s.seatNo, s]));
  const buyInTotal = table.seats.reduce((sum, s) => sum + s.withdrawTotal + s.purchaseTotal, 0);

  return (
    <div className="relative mx-auto w-full max-w-[420px] aspect-[10/14] select-none">
      {/* レール */}
      <div
        className="absolute inset-[7%] rounded-[50%]"
        style={{
          background: "linear-gradient(160deg, var(--rail-edge), var(--rail) 45%)",
          boxShadow: "var(--shadow-hero)",
        }}
      >
        {/* ラシャ */}
        <div
          className="absolute inset-[7%] rounded-[50%] flex flex-col items-center justify-center text-center"
          style={{
            background: "radial-gradient(ellipse at center, var(--felt) 0%, var(--felt-edge) 100%)",
            boxShadow: "inset 0 0 40px rgba(0,0,0,0.55), 0 0 0 2px oklch(1 0 0 / 8%)",
          }}
        >
          <span className="text-[10px] font-black tracking-[0.3em] lowercase text-white/25">flair bar es</span>
          <span className="mt-2 text-lg font-bold text-white/90">{table.name}</span>
          <span className="mt-1 text-xs text-white/60">
            着席 {table.seats.length} / {table.seatCount}
          </span>
          {buyInTotal > 0 && (
            <span className="mt-3 rounded-full bg-black/30 px-3 py-1 text-[11px] font-mono text-white/80">
              持ち込み計 {buyInTotal.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* ディーラー */}
      <div
        className="absolute left-1/2 top-[5%] -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-[10px] font-black tracking-widest text-black"
        style={{ background: "oklch(0.92 0.02 90)", boxShadow: "0 2px 6px rgba(0,0,0,0.5)" }}
      >
        DEALER
      </div>

      {/* 席 */}
      {Array.from({ length: table.seatCount }, (_, i) => i + 1).map((seatNo) => {
        const seat = seatMap.get(seatNo) ?? null;
        const pos = seatPosition(seatNo, table.seatCount);
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
                <div key={seat.sessionId} className="rounded-full p-[2px] animate-scale-in" style={{ background: "var(--chip)" }}>
                  <AvatarImage userId={seat.user.id} nickname={seat.user.nickname} src={seat.user.avatar_url} size={48} />
                </div>
                <span className="max-w-[72px] truncate rounded bg-black/70 px-1.5 text-[10px] font-medium text-white">
                  {seat.user.nickname}
                </span>
                <span className="text-[9px] font-bold text-white/70">P{seatNo}</span>
              </>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-white/30 bg-black/40 text-white/50">
                  <Plus size={18} />
                </div>
                <span className="text-[10px] font-bold text-white/60">P{seatNo}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
