"use client";

import { useState, useCallback } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { SUIT_DISPLAY, RED_SUITS, handValue, type Card, type Suit } from "@/lib/utils/blackjack";

// ── カードコンポーネント ─────────────────────────────────────

function PlayingCard({ card, hidden = false, small = false }: { card: Card; hidden?: boolean; small?: boolean }) {
  const size = small ? "w-10 h-14 text-[10px]" : "w-14 h-20 text-[13px]";

  if (hidden) {
    return (
      <div className={`${size} rounded-lg flex items-center justify-center flex-shrink-0 select-none`}
        style={{ background: "linear-gradient(135deg, #1a0408 0%, #3d0a14 100%)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 3px 8px rgba(0,0,0,0.5)" }}>
        <span className="text-2xl opacity-30">🂠</span>
      </div>
    );
  }

  const [suit, value] = card;
  const isRed = RED_SUITS.has(suit as Suit);
  const color = isRed ? "#e83a4a" : "white";

  return (
    <div
      className={`${size} rounded-lg flex-shrink-0 relative select-none`}
      style={{ background: "linear-gradient(160deg, #fafafa 0%, #f0f0f0 100%)", border: "1px solid rgba(0,0,0,0.15)", boxShadow: "0 3px 8px rgba(0,0,0,0.4)" }}
    >
      <span className="absolute top-1 left-1.5 font-black leading-none" style={{ color, fontSize: small ? "9px" : "12px" }}>
        {value}<br />{SUIT_DISPLAY[suit as Suit]}
      </span>
      <span className="absolute bottom-1 right-1.5 font-black leading-none rotate-180" style={{ color, fontSize: small ? "9px" : "12px" }}>
        {value}<br />{SUIT_DISPLAY[suit as Suit]}
      </span>
      <span className="absolute inset-0 flex items-center justify-center font-black" style={{ color, fontSize: small ? "16px" : "22px" }}>
        {SUIT_DISPLAY[suit as Suit]}
      </span>
    </div>
  );
}

function Hand({ cards, score, label, hideSecond = false }: {
  cards: Card[]; score: number; label: string; hideSecond?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-black tracking-[0.18em] uppercase text-muted-foreground">{label}</p>
        <span className="text-[11px] font-black px-2 py-0.5 rounded-full"
          style={{ background: score > 21 ? "oklch(0.63 0.26 22 / 30%)" : "oklch(1 0 0 / 10%)", color: score > 21 ? "var(--primary)" : "white" }}>
          {hideSecond ? "?" : score}
        </span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {cards.map((card, i) => (
          <PlayingCard key={i} card={card} hidden={hideSecond && i === 1} />
        ))}
      </div>
    </div>
  );
}

// ── ゲーム状態 ───────────────────────────────────────────────

interface GameState {
  sessionId: string;
  playerHand: Card[];
  dealerHand: Card[];
  playerScore: number;
  dealerScore: number;
  status: string;
  net: number;
  settled: boolean;
}

const BET_PRESETS = [50, 100, 200, 500, 1000];

const STATUS_INFO: Record<string, { label: string; color: string; emoji: string }> = {
  blackjack:   { label: "BLACKJACK!!",  color: "#facc15", emoji: "🎊" },
  player_win:  { label: "WIN!",         color: "#4ade80", emoji: "🎉" },
  push:        { label: "PUSH",         color: "#94a3b8", emoji: "🤝" },
  player_bust: { label: "BUST...",      color: "#e83a4a", emoji: "💥" },
  double_bust: { label: "DOUBLE BUST",  color: "#e83a4a", emoji: "💥" },
  dealer_win:  { label: "DEALER WINS",  color: "#e83a4a", emoji: "😔" },
};

export function BlackjackGame({ initialBalance }: { initialBalance: number }) {
  const [balance,   setBalance]   = useState(initialBalance);
  const [bet,       setBet]       = useState(100);
  const [game,      setGame]      = useState<GameState | null>(null);
  const [loading,   setLoading]   = useState<string | null>(null); // 'deal'|'hit'|'stand'|'double'
  const [totalNet,  setTotalNet]  = useState(0);   // このセッションの累計

  // ベット画面 or ゲーム中
  const phase = !game ? "bet" : game.settled ? "result" : "playing";

  // ── ゲーム開始 ─────────────────────────────────────────
  const handleDeal = useCallback(async () => {
    if (bet > balance) return;
    setLoading("deal");
    try {
      const res  = await fetch("/api/blackjack/start", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bet }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      setGame(data);
      setBalance(data.balance);
    } finally { setLoading(null); }
  }, [bet, balance]);

  // ── アクション（ヒット/スタンド/ダブル）──────────────────
  const handleAction = useCallback(async (action: "hit" | "stand" | "double") => {
    if (!game) return;
    setLoading(action);
    try {
      const res  = await fetch("/api/blackjack/action", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: game.sessionId, action }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      setGame((prev) => ({ ...prev!, ...data }));
      if (data.settled) {
        setTotalNet((p) => p + (data.net as number));
        // balance を再取得する代わりに概算
        const totalBet = action === "double" ? game.net : 0; // ダブルは追加ベット分調整不要(サーバー側で処理済み)
        setBalance((b) => b + (data.net > 0 ? data.net + game.net : 0) + totalBet);
      }
    } finally { setLoading(null); }
  }, [game]);

  // ── 次のゲーム ──────────────────────────────────────────
  const handleNext = useCallback(async () => {
    // 最新残高取得
    try {
      const res = await fetch("/api/me/balance");
      if (res.ok) {
        const json = await res.json();
        setBalance(json.chip_balance);
      }
    } catch { /* ignore */ }
    setGame(null);
  }, []);

  const canDouble = phase === "playing" && game?.playerHand.length === 2 && balance >= (game?.net ?? 0);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "radial-gradient(ellipse at 50% 0%, oklch(0.12 0.025 145) 0%, oklch(0.06 0.01 22) 70%)" }}>

      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-muted-foreground">Blackjack</p>
          <p className="text-sm font-black text-white">vs. <span style={{ color: "#facc15" }}>つっちー</span></p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">残高</p>
          <p className="text-lg font-black tabular-nums text-white">{balance.toLocaleString()}
            <span className="text-xs font-bold text-muted-foreground ml-0.5">chip</span>
          </p>
        </div>
      </div>

      {/* ディーラー */}
      <div className="px-5 py-4 space-y-3">
        {/* つっちーアバター */}
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: "linear-gradient(135deg, oklch(0.25 0.04 145) 0%, oklch(0.15 0.02 145) 100%)", border: "2px solid oklch(0.45 0.12 145 / 50%)", boxShadow: "0 0 16px oklch(0.45 0.12 145 / 30%)" }}
          >
            {/* つっちーの画像プレースホルダー（後で /dealer-tsucchi.png に差し替え） */}
            🃏
          </div>
          <div>
            <p className="font-black text-white">つっちー</p>
            <p className="text-[10px] text-muted-foreground">Dealer</p>
          </div>
        </div>

        {/* ディーラーの手札 */}
        {game && (
          <Hand
            cards={game.dealerHand}
            score={game.dealerScore}
            label="DEALER"
            hideSecond={!game.settled}
          />
        )}
      </div>

      {/* テーブル中央 */}
      <div className="flex-1 px-5 flex flex-col justify-center gap-6">

        {/* ── ベット画面 ── */}
        {phase === "bet" && (
          <div className="space-y-6 animate-scale-in">
            {totalNet !== 0 && (
              <p className="text-center text-sm font-bold"
                style={{ color: totalNet > 0 ? "#4ade80" : "#e83a4a" }}>
                今回の合計: {totalNet > 0 ? "+" : ""}{totalNet.toLocaleString()} chip
              </p>
            )}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center">
                BET AMOUNT
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {BET_PRESETS.filter((p) => p <= balance).map((p) => (
                  <button key={p} onClick={() => setBet(p)}
                    className="px-4 py-2 rounded-xl font-black text-sm interactive"
                    style={{
                      background: bet === p ? "var(--primary)" : "oklch(1 0 0 / 8%)",
                      color: bet === p ? "white" : "var(--muted-foreground)",
                      boxShadow: bet === p ? "var(--shadow-neon)" : undefined,
                      border: `1px solid ${bet === p ? "var(--primary)" : "oklch(1 0 0 / 15%)"}`,
                    }}>
                    {p.toLocaleString()}
                  </button>
                ))}
                {balance > 0 && (
                  <button onClick={() => setBet(balance)}
                    className="px-4 py-2 rounded-xl font-black text-sm interactive"
                    style={{
                      background: bet === balance ? "var(--primary)" : "oklch(1 0 0 / 8%)",
                      color: bet === balance ? "white" : "var(--muted-foreground)",
                      border: `1px solid ${bet === balance ? "var(--primary)" : "oklch(1 0 0 / 15%)"}`,
                    }}>
                    ALL IN
                  </button>
                )}
              </div>
              <p className="text-center text-2xl font-black text-white">
                {bet.toLocaleString()} <span className="text-sm text-muted-foreground">chip</span>
              </p>
            </div>

            <button
              onClick={handleDeal}
              disabled={!!loading || bet > balance || balance === 0}
              className="w-full py-4 rounded-2xl font-black text-lg text-white interactive"
              style={{ background: "linear-gradient(135deg, oklch(0.40 0.15 145) 0%, oklch(0.28 0.10 145) 100%)", boxShadow: "0 0 24px oklch(0.40 0.15 145 / 40%)" }}
            >
              {loading === "deal" ? <Loader2 size={20} className="animate-spin mx-auto" /> : "DEAL"}
            </button>
          </div>
        )}

        {/* ── プレイヤー手札 ── */}
        {game && (
          <Hand cards={game.playerHand} score={game.playerScore} label="YOUR HAND" />
        )}

        {/* ── 結果 ── */}
        {phase === "result" && game && (() => {
          const info = STATUS_INFO[game.status] ?? { label: game.status, color: "white", emoji: "—" };
          return (
            <div className="space-y-4 animate-scale-in text-center">
              <div>
                <p className="text-5xl mb-2">{info.emoji}</p>
                <p className="text-3xl font-black" style={{ color: info.color }}>{info.label}</p>
                <p className="text-xl font-black mt-1" style={{ color: game.net >= 0 ? "#4ade80" : "#e83a4a" }}>
                  {game.net >= 0 ? "+" : ""}{game.net.toLocaleString()} chip
                </p>
              </div>
              <button
                onClick={handleNext}
                className="flex items-center gap-2 mx-auto px-6 py-3 rounded-2xl font-black text-white interactive"
                style={{ background: "oklch(1 0 0 / 10%)", border: "1px solid oklch(1 0 0 / 20%)" }}
              >
                <RefreshCw size={16} /> もう一度
              </button>
            </div>
          );
        })()}
      </div>

      {/* ── アクションボタン ── */}
      {phase === "playing" && (
        <div className="px-5 pb-8 pt-4 space-y-3">
          <div className="flex gap-3">
            <button
              onClick={() => handleAction("hit")}
              disabled={!!loading}
              className="flex-1 py-4 rounded-2xl font-black text-lg text-white interactive"
              style={{ background: "linear-gradient(135deg, oklch(0.50 0.22 22) 0%, oklch(0.35 0.18 22) 100%)", boxShadow: "var(--shadow-neon)" }}
            >
              {loading === "hit" ? <Loader2 size={18} className="animate-spin mx-auto" /> : "HIT"}
            </button>
            <button
              onClick={() => handleAction("stand")}
              disabled={!!loading}
              className="flex-1 py-4 rounded-2xl font-black text-lg text-white interactive"
              style={{ background: "linear-gradient(135deg, oklch(0.32 0.08 220) 0%, oklch(0.22 0.06 220) 100%)", boxShadow: "0 0 16px oklch(0.32 0.08 220 / 30%)" }}
            >
              {loading === "stand" ? <Loader2 size={18} className="animate-spin mx-auto" /> : "STAND"}
            </button>
          </div>
          {canDouble && (
            <button
              onClick={() => handleAction("double")}
              disabled={!!loading}
              className="w-full py-3 rounded-2xl font-black text-sm text-white interactive"
              style={{ background: "oklch(0.45 0.15 60 / 30%)", border: "1px solid oklch(0.45 0.15 60 / 40%)", color: "#facc15" }}
            >
              {loading === "double" ? <Loader2 size={16} className="animate-spin mx-auto" /> : `DOUBLE DOWN (+${(game?.net ?? 0).toLocaleString()} chip)`}
            </button>
          )}
          {/* ベット表示 */}
          <p className="text-center text-[10px] text-muted-foreground">
            BET: {game?.net !== undefined ? Math.abs(0).toLocaleString() : bet.toLocaleString()} chip
          </p>
        </div>
      )}
    </div>
  );
}
