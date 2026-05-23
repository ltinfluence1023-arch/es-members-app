"use client";

import { useState, useCallback, useRef } from "react";
import { Loader2, RefreshCw, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { SUIT_DISPLAY, RED_SUITS, type Card, type Suit } from "@/lib/utils/blackjack";
import { getAvatarColor } from "@/lib/utils/avatar";

// ─────────────────────────────────────────────────────────────────────────────
// PlayingCard — 60×84px
// ─────────────────────────────────────────────────────────────────────────────

function PlayingCard({ card, hidden = false, delay = 0, flipReveal = false }: {
  card: Card; hidden?: boolean; delay?: number; flipReveal?: boolean;
}) {
  const [suit, value] = card;
  const isRed = RED_SUITS.has(suit as Suit);
  const anim = flipReveal
    ? `bj-flip-reveal 0.45s cubic-bezier(0.22,1,0.36,1) ${delay}s both`
    : `bj-deal 0.28s cubic-bezier(0.22,1,0.36,1) ${delay}s both`;

  if (hidden) {
    return (
      <div className="w-[60px] h-[84px] rounded-xl flex items-center justify-center flex-shrink-0 select-none relative overflow-hidden"
        style={{ animation: anim,
          background: "linear-gradient(145deg,oklch(0.22 0.07 145) 0%,oklch(0.12 0.03 145) 100%)",
          border: "1.5px solid oklch(0.38 0.08 145 / 50%)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.55),inset 0 1px 0 oklch(1 0 0 / 7%)" }}>
        <div className="absolute inset-2 rounded-lg opacity-20" style={{
          backgroundImage:
            "repeating-linear-gradient(45deg,oklch(0.5 0.1 145) 0,oklch(0.5 0.1 145) 1px,transparent 1px,transparent 7px)," +
            "repeating-linear-gradient(-45deg,oklch(0.5 0.1 145) 0,oklch(0.5 0.1 145) 1px,transparent 1px,transparent 7px)" }} />
        <span style={{ fontSize: 22, opacity: 0.28 }}>🂠</span>
      </div>
    );
  }
  return (
    <div className="w-[60px] h-[84px] rounded-xl flex-shrink-0 relative select-none"
      style={{ animation: anim,
        background: "linear-gradient(160deg,#fefefe 0%,#efefef 100%)",
        border: "1px solid rgba(0,0,0,0.10)",
        boxShadow: "0 5px 14px rgba(0,0,0,0.45),0 1px 3px rgba(0,0,0,0.2)" }}>
      <div className="absolute top-[4px] left-[5px] font-black leading-[1.15] text-[12px]"
        style={{ color: isRed ? "#e83a4a" : "#1a1a1a" }}>
        {value}<br />{SUIT_DISPLAY[suit as Suit]}
      </div>
      <div className="absolute inset-0 flex items-center justify-center font-black text-[28px]"
        style={{ color: isRed ? "#e83a4a" : "#1a1a1a" }}>
        {SUIT_DISPLAY[suit as Suit]}
      </div>
      <div className="absolute bottom-[4px] right-[5px] font-black leading-[1.15] text-[12px] rotate-180"
        style={{ color: isRed ? "#e83a4a" : "#1a1a1a" }}>
        {value}<br />{SUIT_DISPLAY[suit as Suit]}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ScoreBadge — 見やすい大きめサイズ
// ─────────────────────────────────────────────────────────────────────────────

function ScoreBadge({ score, hidden = false }: { score: number; hidden?: boolean }) {
  const isBust = score > 21;
  const isBJ   = score === 21;
  let bg = "oklch(1 0 0 / 14%)"; let color = "rgba(255,255,255,0.92)";
  if (hidden)      { bg = "oklch(1 0 0 / 7%)";          color = "oklch(1 0 0 / 32%)"; }
  else if (isBust) { bg = "oklch(0.55 0.22 22 / 35%)";  color = "#ff6b6b"; }
  else if (isBJ)   { bg = "oklch(0.82 0.18 85 / 30%)";  color = "#fbbf24"; }
  return (
    <div key={hidden ? "h" : score}
      className="inline-flex items-center px-2.5 py-[3px] rounded-full font-black text-[14px] flex-shrink-0"
      style={{ background: bg, color, minWidth: 36, justifyContent: "center",
        animation: "bj-score-update 0.3s cubic-bezier(0.22,1,0.36,1) both",
        border: isBJ ? "1px solid oklch(0.82 0.18 85 / 40%)" : isBust ? "1px solid oklch(0.55 0.22 22 / 40%)" : "1px solid oklch(1 0 0 / 12%)" }}>
      {hidden ? "?" : isBust ? "BUST" : isBJ ? "BJ!" : score}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChipButton
// ─────────────────────────────────────────────────────────────────────────────

const CHIP_STYLES: Record<number, { bg: string; ring: string; text: string }> = {
  10:   { bg: "oklch(0.32 0.08 220)",  ring: "#7dd3fc", text: "10"  },
  25:   { bg: "oklch(0.34 0.12 145)",  ring: "#4ade80", text: "25"  },
  50:   { bg: "oklch(0.38 0.14 270)",  ring: "#a78bfa", text: "50"  },
  75:   { bg: "oklch(0.36 0.14 55)",   ring: "#fbbf24", text: "75"  },
  100:  { bg: "oklch(0.40 0.20 22)",   ring: "#f87171", text: "100" },
};

function ChipButton({ amount, selected, onClick, disabled }: {
  amount: number; selected: boolean; onClick: () => void; disabled: boolean;
}) {
  const s = CHIP_STYLES[amount] ?? CHIP_STYLES[100];
  return (
    <button onClick={onClick} disabled={disabled}
      className="relative flex items-center justify-center rounded-full font-black select-none flex-shrink-0"
      style={{ width: 56, height: 56, background: s.bg, border: `2.5px solid ${s.ring}`,
        boxShadow: selected ? `0 0 18px ${s.ring}70,0 5px 14px rgba(0,0,0,0.5)` : "0 3px 8px rgba(0,0,0,0.4)",
        transform: selected ? "translateY(-6px) scale(1.1)" : "translateY(0) scale(1)",
        transition: "transform 0.18s cubic-bezier(0.22,1,0.36,1),box-shadow 0.18s ease",
        opacity: disabled ? 0.35 : 1 }}>
      <div className="absolute inset-[4px] rounded-full pointer-events-none"
        style={{ border: `1.5px dashed ${s.ring}50` }} />
      <span className="text-white text-[12px] font-black relative z-10 leading-none">{s.text}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Types / constants
// ─────────────────────────────────────────────────────────────────────────────

interface GameState {
  sessionId: string; playerHand: Card[]; dealerHand: Card[];
  playerScore: number; dealerScore: number;
  status: string; net: number; settled: boolean; bet: number;
}
interface HistoryEntry {
  dealerScore: number;
  playerScore: number;
  status: string;
  net: number;
}

const MAX_BET     = 100;
const BET_PRESETS = [10, 25, 50, 75, 100];

const STATUS_INFO: Record<string, { label: string; color: string; emoji: string }> = {
  blackjack:   { label: "BLACKJACK!!", color: "#fbbf24", emoji: "🎊" },
  player_win:  { label: "YOU WIN!",    color: "#4ade80", emoji: "🎉" },
  push:        { label: "PUSH",        color: "#94a3b8", emoji: "🤝" },
  player_bust: { label: "BUST",        color: "#f87171", emoji: "💥" },
  double_bust: { label: "DOUBLE BUST", color: "#f87171", emoji: "💥" },
  dealer_win:  { label: "DEALER WINS", color: "#f87171", emoji: "😔" },
};

// ─────────────────────────────────────────────────────────────────────────────
// BlackjackGame
// ─────────────────────────────────────────────────────────────────────────────

export function BlackjackGame({
  initialBalance,
  nickname,
  avatarUrl,
}: {
  initialBalance: number;
  nickname: string;
  avatarUrl: string | null;
}) {
  const [balance,  setBalance]  = useState(initialBalance);
  const [bet,      setBet]      = useState(25);
  const [game,     setGame]     = useState<GameState | null>(null);
  const [loading,  setLoading]  = useState<string | null>(null);
  const [history,  setHistory]  = useState<HistoryEntry[]>([]);
  const [totalNet, setTotalNet] = useState(0);

  const prevSettled = useRef(false);
  if (game?.settled) prevSettled.current = true;
  if (!game)         prevSettled.current = false;

  const phase     = !game ? "bet" : game.settled ? "result" : "playing";
  const isWin     = game ? ["blackjack","player_win"].includes(game.status) : false;
  const isBust    = game ? ["player_bust","double_bust"].includes(game.status) : false;
  const canDouble = phase === "playing" && game?.playerHand.length === 2 && balance >= (game?.bet ?? 0);

  // ディーラーの表情（ゲーム結果に応じて変化）
  // 画像: /public/dealer-tsucchi.jpg / dealer-tsucchi-win.jpg / dealer-tsucchi-lose.jpg
  const dealerMood = !game?.settled ? "neutral"
    : ["dealer_win","player_bust","double_bust"].includes(game.status) ? "win"
    : game.status === "push" ? "push"
    : "lose";

  const DEALER_IMG: Record<string, string> = {
    neutral: "/dealer-tsucchi.jpg",
    win:     "/dealer-tsucchi-win.jpg",
    lose:    "/dealer-tsucchi-lose.jpg",
    push:    "/dealer-tsucchi.jpg",
  };

  const handleDeal = useCallback(async () => {
    if (bet > balance) return;
    setLoading("deal");
    try {
      const res  = await fetch("/api/blackjack/start", { method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bet }) });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "エラーが発生しました"); return; }
      setGame({ ...data, settled: data.settled ?? false });
      setBalance(data.balance);
      if (data.settled) {
        setTotalNet((p) => p + (data.net as number));
        setHistory((h) => [{ dealerScore: data.dealerScore, playerScore: data.playerScore, status: data.status, net: data.net }, ...h].slice(0, 10));
      }
    } catch (err) { console.error("[BJ deal]", err); alert("通信エラーが発生しました。再度お試しください。"); }
    finally { setLoading(null); }
  }, [bet, balance]);

  const handleAction = useCallback(async (action: "hit" | "stand" | "double") => {
    if (!game) return;
    setLoading(action);
    try {
      const res  = await fetch("/api/blackjack/action", { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: game.sessionId, action }) });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "エラーが発生しました"); return; }
      setGame((prev) => ({ ...prev!, ...data }));
      if (data.settled) {
        setTotalNet((p) => p + (data.net as number));
        if (data.balance !== undefined) setBalance(data.balance);
        setHistory((h) => [{ dealerScore: data.dealerScore, playerScore: data.playerScore, status: data.status, net: data.net }, ...h].slice(0, 10));
      }
    } catch (err) { console.error("[BJ action]", err); alert("通信エラーが発生しました。再度お試しください。"); }
    finally { setLoading(null); }
  }, [game]);

  const handleNext = useCallback(async () => {
    try { const res = await fetch("/api/me/balance"); if (res.ok) { const j = await res.json(); setBalance(j.chip_balance); } }
    catch { /* ignore */ }
    setGame(null);
  }, []);

  return (
    // h-[100dvh] 固定 + overflow-hidden でスクロール完全禁止
    <div className="flex flex-col select-none overflow-hidden"
      style={{ height: "100dvh",
        background: "radial-gradient(ellipse 120% 70% at 50% 30%,oklch(0.18 0.07 145) 0%,oklch(0.07 0.02 145) 55%,oklch(0.04 0.01 22) 100%)" }}>

      {/* ══ ヘッダー（flex-shrink-0） ══════════════════════════════ */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 pt-3 pb-1">
        <Link href="/home" className="interactive p-1" style={{ color: "oklch(1 0 0 / 40%)" }}>
          <ChevronLeft size={18} />
        </Link>
        <div className="text-center leading-tight">
          <p className="text-[8px] font-black tracking-[0.3em] uppercase" style={{ color: "oklch(0.82 0.18 85 / 60%)" }}>
            ✦ BLACKJACK ✦
          </p>
          <p className="text-[9px] font-bold" style={{ color: "oklch(1 0 0 / 40%)" }}>
            vs. <span style={{ color: "#fbbf24" }}>つっちー</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[8px]" style={{ color: "oklch(1 0 0 / 35%)" }}>残高</p>
          <p className="text-[15px] font-black tabular-nums text-white leading-none">
            {balance.toLocaleString()}
            <span className="text-[9px] font-bold ml-0.5" style={{ color: "oklch(1 0 0 / 38%)" }}>chip</span>
          </p>
        </div>
      </div>

      {/* ══ テーブル本体（flex-1 / min-h-0 必須）══════════════════ */}
      {/*
        構造: ディーラー行 → セパレータ → プレイヤー行 → フェーズコンテンツ → flex-1 余白
        ポイント: flex-1余白はコンテンツの後ろに置く（ボタンとカードの間に入れない）
      */}
      <div className="flex-1 flex flex-col min-h-0 px-4">

        {/* ── ディーラー行（アバター左・カード・スコア右 = 1行）── */}
        {/* ── ディーラー（アイコン上・カード下）── */}
        <div className="flex-shrink-0 pt-2 pb-1">
          {/* アイコン行（上）
              画像: /public/dealer-tsucchi.jpg / dealer-tsucchi-win.jpg / dealer-tsucchi-lose.jpg */}
          <div className="flex items-center gap-2.5 mb-2">
            <div
              key={dealerMood}
              className="w-12 h-12 rounded-full overflow-hidden relative flex-shrink-0"
              style={{
                background: "linear-gradient(135deg,oklch(0.28 0.06 145) 0%,oklch(0.16 0.03 145) 100%)",
                border: dealerMood === "win"  ? "2px solid #fbbf24aa"
                      : dealerMood === "lose" ? "2px solid #f87171aa"
                      : "2px solid oklch(0.42 0.10 145 / 50%)",
                boxShadow: dealerMood === "win"  ? "0 0 14px #fbbf2455"
                         : dealerMood === "lose" ? "0 0 14px #f8717145"
                         : "0 0 10px oklch(0.35 0.10 145 / 28%)",
                animation: dealerMood !== "neutral" ? "bj-chip-bounce 0.5s cubic-bezier(0.22,1,0.36,1)" : undefined,
              }}>
              <img src={DEALER_IMG[dealerMood]} alt="つっちー" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-[11px] font-black text-white leading-none">つっちー</p>
              <p className="text-[9px]" style={{ color: "oklch(1 0 0 / 40%)" }}>Dealer</p>
            </div>
            {game && <div className="ml-auto"><ScoreBadge score={game.dealerScore} hidden={!game.settled} /></div>}
          </div>
          {/* カード行（下）*/}
          <div className="flex gap-2 flex-wrap items-end min-h-[84px] pl-1">
            {game ? (
              <>
                <PlayingCard key="d-0" card={game.dealerHand[0]} delay={0} />
                {game.settled
                  ? game.dealerHand.slice(1).map((card, i) => (
                      <PlayingCard key={`d-s-${i+1}`} card={card} delay={i * 0.07} flipReveal={i === 0} />
                    ))
                  : <PlayingCard key="d-hidden" card={game.dealerHand[0]} hidden delay={0.1} />}
              </>
            ) : (
              <p className="text-[10px] font-black tracking-widest self-center"
                style={{ color: "oklch(1 0 0 / 14%)" }}>— DEALER —</p>
            )}
          </div>
        </div>

        {/* ── セパレータ ── */}
        <div className="flex-shrink-0 flex items-center justify-center my-1" style={{ height: 18 }}>
          <div className="w-full h-px" style={{ background: "oklch(1 0 0 / 8%)" }} />
          {phase === "playing" && (
            <div className="absolute px-3 py-[2px] rounded-full text-[8px] font-black tracking-widest"
              style={{ background: "oklch(0.12 0.04 145 / 90%)", border: "1px solid oklch(1 0 0 / 10%)",
                color: "oklch(1 0 0 / 38%)", backdropFilter: "blur(6px)" }}>
              BET {(game?.bet ?? bet).toLocaleString()} chip
            </div>
          )}
        </div>

        {/* ── プレイヤー（カード上・アイコン下）── */}
        <div className="flex-shrink-0 pt-1 pb-2">
          {/* カード行（上）*/}
          <div className="flex gap-2 flex-wrap items-end min-h-[84px] pl-1 mb-2"
            style={{ animation: isBust && game?.settled ? "bj-bust-shake 0.55s ease 0.1s" : undefined }}>
            {game ? (
              game.playerHand.map((card, i) => (
                <PlayingCard key={`p-${i}-${game.playerHand.length}`} card={card} delay={i * 0.08} />
              ))
            ) : (
              <p className="text-[10px] font-black tracking-widest self-center"
                style={{ color: "oklch(1 0 0 / 14%)" }}>— PLAYER —</p>
            )}
          </div>
          {/* アイコン行（下）*/}
          <div className="flex items-center gap-2.5">
            {/* プレイヤーアバター */}
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={nickname}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                style={{ border: "2px solid oklch(0.45 0.10 270 / 60%)" }} />
            ) : (
              <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center font-black text-white text-lg"
                style={{ background: getAvatarColor("player"), border: "2px solid oklch(0.45 0.10 270 / 35%)" }}>
                {(nickname || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-[11px] font-black text-white leading-none">{nickname || "YOU"}</p>
              <p className="text-[9px]" style={{ color: "oklch(1 0 0 / 40%)" }}>Player</p>
            </div>
            {game && <div className="ml-auto"><ScoreBadge score={game.playerScore} /></div>}
          </div>
        </div>

        {/* ── フェーズコンテンツ（カードのすぐ下に配置）── */}
        {/* ポイント: ここに直接置くことでカード↔ボタン間の余白をゼロにする */}

        {/* ベット画面 */}
        {phase === "bet" && (
          <div className="flex-shrink-0 flex flex-col gap-3 pt-1 animate-scale-in">
            {totalNet !== 0 && (
              <p className="text-center text-[11px] font-black"
                style={{ color: totalNet > 0 ? "#4ade80" : "#f87171" }}>
                セッション合計: {totalNet > 0 ? "+" : ""}{totalNet.toLocaleString()} chip
              </p>
            )}
            <div className="space-y-2">
              <p className="text-[8px] font-black tracking-[0.25em] uppercase text-center"
                style={{ color: "oklch(1 0 0 / 35%)" }}>BET AMOUNT</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {BET_PRESETS.filter((p) => p <= balance && p <= MAX_BET).map((p) => (
                  <ChipButton key={p} amount={p} selected={bet === p} onClick={() => setBet(p)} disabled={!!loading} />
                ))}
                {/* ALL IN: 残高が MAX_BET 未満かつプリセットに含まれない場合 */}
                {balance > 0 && balance < MAX_BET && !BET_PRESETS.includes(balance) && (
                  <button onClick={() => setBet(balance)} disabled={!!loading}
                    className="relative flex items-center justify-center rounded-full font-black flex-shrink-0"
                    style={{ width: 56, height: 56,
                      background: bet === balance ? "oklch(0.30 0.06 60)" : "oklch(0.15 0.02 22)",
                      border: `2.5px solid ${bet === balance ? "#fbbf24" : "oklch(1 0 0 / 20%)"}`,
                      boxShadow: bet === balance ? "0 0 16px #fbbf2445,0 5px 14px rgba(0,0,0,0.5)" : "0 3px 8px rgba(0,0,0,0.4)",
                      transform: bet === balance ? "translateY(-6px) scale(1.1)" : undefined,
                      transition: "transform 0.18s,box-shadow 0.18s",
                      opacity: !!loading ? 0.35 : 1 }}>
                    <div className="absolute inset-[4px] rounded-full"
                      style={{ border: `1.5px dashed ${bet === balance ? "#fbbf2455" : "oklch(1 0 0 / 15%)"}` }} />
                    <span className="text-white text-[10px] font-black z-10 leading-none">ALL<br />IN</span>
                  </button>
                )}
              </div>
              <p className="text-center text-[28px] font-black text-white tabular-nums leading-none">
                {bet.toLocaleString()}
                <span className="text-[12px] font-bold ml-1" style={{ color: "oklch(1 0 0 / 40%)" }}>chip</span>
              </p>
            </div>
            <button onClick={handleDeal} disabled={!!loading || bet > balance || balance === 0}
              className="py-[15px] rounded-2xl font-black text-[17px] text-white interactive relative overflow-hidden"
              style={{ background: "linear-gradient(135deg,oklch(0.75 0.18 85) 0%,oklch(0.58 0.20 75) 100%)",
                boxShadow: "0 0 22px oklch(0.75 0.18 85 / 40%),0 5px 16px rgba(0,0,0,0.4)",
                letterSpacing: "0.18em" }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.20) 50%,transparent 60%)",
                  animation: !loading ? "shimmer-sweep 2.5s ease 1s infinite" : undefined }} />
              {loading === "deal" ? <Loader2 size={20} className="animate-spin mx-auto" /> : "DEAL"}
            </button>
          </div>
        )}

        {/* ゲーム中アクション */}
        {phase === "playing" && (
          <div className="flex-shrink-0 flex flex-col gap-2 pt-3 pb-4">
            {canDouble && (
              <button onClick={() => handleAction("double")} disabled={!!loading}
                className="w-full py-[10px] rounded-xl font-black text-[12px] interactive"
                style={{ background: "oklch(0.28 0.08 60 / 28%)",
                  border: "1.5px solid oklch(0.75 0.18 60 / 38%)", color: "#fbbf24" }}>
                {loading === "double"
                  ? <Loader2 size={14} className="animate-spin mx-auto" />
                  : `DOUBLE DOWN  +${(game?.bet ?? 0).toLocaleString()} chip`}
              </button>
            )}
            <div className="flex gap-3">
              <button onClick={() => handleAction("hit")} disabled={!!loading}
                className="flex-1 py-[15px] rounded-2xl font-black text-[19px] text-white interactive"
                style={{ background: "linear-gradient(135deg,oklch(0.50 0.24 22) 0%,oklch(0.35 0.20 22) 100%)",
                  boxShadow: "var(--shadow-neon),0 5px 14px rgba(0,0,0,0.4)" }}>
                {loading === "hit" ? <Loader2 size={18} className="animate-spin mx-auto" /> : "HIT"}
              </button>
              <button onClick={() => handleAction("stand")} disabled={!!loading}
                className="flex-1 py-[15px] rounded-2xl font-black text-[19px] text-white interactive"
                style={{ background: "linear-gradient(135deg,oklch(0.32 0.10 235) 0%,oklch(0.22 0.07 235) 100%)",
                  boxShadow: "0 0 16px oklch(0.32 0.10 235 / 38%),0 5px 14px rgba(0,0,0,0.4)" }}>
                {loading === "stand" ? <Loader2 size={18} className="animate-spin mx-auto" /> : "STAND"}
              </button>
            </div>
          </div>
        )}

        {/* 結果画面 */}
        {phase === "result" && game && (() => {
          const info = STATUS_INFO[game.status] ?? { label: game.status, color: "white", emoji: "—" };
          return (
            <div className="flex-shrink-0 flex flex-col items-center gap-2.5 pt-2">
              <div className="w-full rounded-2xl px-4 py-4 text-center relative overflow-hidden"
                style={{ animation: "bj-result-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) both",
                  background: isWin
                    ? "linear-gradient(135deg,oklch(0.22 0.07 85) 0%,oklch(0.14 0.04 85) 100%)"
                    : isBust ? "linear-gradient(135deg,oklch(0.18 0.07 22) 0%,oklch(0.10 0.03 22) 100%)"
                    : "oklch(1 0 0 / 5%)",
                  border: `1.5px solid ${info.color}38`,
                  boxShadow: isWin ? `0 0 36px ${info.color}28,0 8px 28px rgba(0,0,0,0.4)` : "0 5px 20px rgba(0,0,0,0.3)" }}>
                {isWin && (
                  <>
                    <div className="absolute inset-0 rounded-2xl pointer-events-none"
                      style={{ animation: "bj-win-ring 1s ease-out 0.3s infinite", border: `2px solid ${info.color}40` }} />
                    <div className="absolute inset-0 rounded-2xl pointer-events-none"
                      style={{ animation: "bj-win-ring 1s ease-out 0.65s infinite", border: `1px solid ${info.color}22` }} />
                  </>
                )}

                {/* ── つっちーアイコン（大）── */}
                <div className="flex justify-center mb-2 relative z-10"
                  style={{ animation: "bj-result-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.05s both" }}>
                  <div className="relative">
                    {/* リングエフェクト */}
                    <div className="absolute inset-0 rounded-full pointer-events-none"
                      style={{ animation: "bj-win-ring 1.2s ease-out 0.4s infinite",
                        border: `3px solid ${info.color}50` }} />
                    <div className="w-20 h-20 rounded-full overflow-hidden relative flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg,oklch(0.28 0.06 145) 0%,oklch(0.16 0.03 145) 100%)",
                        border: dealerMood === "win"  ? `3px solid #fbbf24` : dealerMood === "lose" ? `3px solid #f87171` : `3px solid oklch(0.42 0.10 145 / 60%)`,
                        boxShadow: dealerMood === "win"  ? "0 0 24px #fbbf2460,0 8px 20px rgba(0,0,0,0.5)"
                                 : dealerMood === "lose" ? "0 0 24px #f8717150,0 8px 20px rgba(0,0,0,0.5)"
                                 : "0 8px 20px rgba(0,0,0,0.5)",
                      }}>
                      <img src={DEALER_IMG[dealerMood]} alt="つっちー"
                        className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                  </div>
                </div>

                <p className="text-[20px] font-black relative z-10" style={{ color: info.color, letterSpacing: "0.05em" }}>
                  {info.label}
                </p>
                {/* ディーラー最終スコア */}
                <div className="flex items-center justify-center gap-2 mt-1.5 relative z-10">
                  <span className="text-[9px] font-bold" style={{ color: "oklch(1 0 0 / 38%)" }}>DEALER</span>
                  <span className="text-[16px] font-black tabular-nums"
                    style={{ color: game.dealerScore > 21 ? "#f87171" : game.dealerScore === 21 ? "#fbbf24" : "rgba(255,255,255,0.85)" }}>
                    {game.dealerScore > 21 ? "BUST" : game.dealerScore}
                  </span>
                  <span className="text-[9px] font-bold" style={{ color: "oklch(1 0 0 / 38%)" }}>vs</span>
                  <span className="text-[9px] font-bold" style={{ color: "oklch(1 0 0 / 38%)" }}>YOU</span>
                  <span className="text-[16px] font-black tabular-nums"
                    style={{ color: game.playerScore > 21 ? "#f87171" : game.playerScore === 21 ? "#fbbf24" : "rgba(255,255,255,0.85)" }}>
                    {game.playerScore > 21 ? "BUST" : game.playerScore}
                  </span>
                </div>
                <p className="text-[32px] font-black mt-1 relative z-10 tabular-nums"
                  style={{ color: game.net >= 0 ? "#4ade80" : "#f87171",
                    animation: "bj-net-pop 0.4s cubic-bezier(0.22,1,0.36,1) 0.2s both" }}>
                  {game.net >= 0 ? "+" : ""}{game.net.toLocaleString()}
                  <span className="text-[12px] font-bold ml-1" style={{ color: "oklch(1 0 0 / 40%)" }}>chip</span>
                </p>
                {totalNet !== 0 && (
                  <p className="text-[9px] mt-1 relative z-10" style={{ color: "oklch(1 0 0 / 30%)" }}>
                    累計: {totalNet > 0 ? "+" : ""}{totalNet.toLocaleString()} chip
                  </p>
                )}
              </div>

              {/* ── セッション履歴バー ── */}
              {history.length > 1 && (
                <div className="w-full flex flex-col gap-1">
                  <p className="text-[8px] font-black tracking-[0.2em] uppercase text-center"
                    style={{ color: "oklch(1 0 0 / 25%)" }}>HISTORY</p>
                  <div className="flex gap-1 justify-center flex-wrap">
                    {history.slice(0, 8).map((h, i) => {
                      const isW = ["blackjack","player_win"].includes(h.status);
                      const isB = ["player_bust","double_bust","dealer_win"].includes(h.status);
                      const col = isW ? "#4ade80" : isB ? "#f87171" : "#94a3b8";
                      return (
                        <div key={i}
                          className="flex flex-col items-center px-2 py-1 rounded-lg"
                          style={{ background: `${col}18`, border: `1px solid ${col}35`, minWidth: 36 }}>
                          <span className="text-[9px] font-black tabular-nums" style={{ color: col }}>
                            {h.dealerScore > 21 ? "B" : h.dealerScore}
                          </span>
                          <span className="text-[7px]" style={{ color: "oklch(1 0 0 / 30%)" }}>
                            {h.net >= 0 ? "+" : ""}{h.net}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-white interactive text-[12px]"
                style={{ background: "oklch(1 0 0 / 8%)", border: "1.5px solid oklch(1 0 0 / 15%)" }}>
                <RefreshCw size={13} /> もう一度
              </button>
            </div>
          );
        })()}

        {/* ══ flex-1 余白はコンテンツの後ろ ══════════════════════════
            ここに置くことで、カード↔ボタン間に余白が発生しない。
            余白はボタンの下（画面下部）に集まる。              */}
        <div className="flex-1" />
      </div>
    </div>
  );
}
