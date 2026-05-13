"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp, Loader2, Send, Lock, ImagePlus, X } from "lucide-react";
import { calcAchievementRank, ACHIEVEMENT_RANKS } from "@/lib/utils/achievementRank";

interface Achievement {
  id: string; code: string; name: string; description: string;
  category: string; difficulty: number; points: number; chip_reward: number;
  track_type: string;
  earned: boolean; earnedAt: string | null; claimStatus: string | null;
}

const CATEGORY_META: Record<string, { emoji: string; label: string }> = {
  visit:     { emoji: "🗓", label: "来店" },
  social:    { emoji: "🤝", label: "交流" },
  game:      { emoji: "🎲", label: "ゲーム" },
  sns:       { emoji: "📱", label: "SNS" },
  community: { emoji: "🌟", label: "コミュニティ" },
};

const TRACK_LABEL: Record<string, string> = {
  auto:        "🤖 自動達成",
  staff_grant: "👨‍💼 スタッフが付与",
  user_claim:  "📱 自己申請",
};

const STARS = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

function StatusBadge({ a }: { a: Achievement }) {
  if (a.earned) return (
    <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ background: "oklch(0.55 0.18 145 / 20%)", color: "#4ade80", border: "1px solid oklch(0.55 0.18 145 / 40%)" }}>
      <CheckCircle2 size={10} /> 達成
    </span>
  );
  if (a.claimStatus === "pending") return (
    <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ background: "oklch(0.65 0.18 60 / 20%)", color: "#facc15", border: "1px solid oklch(0.65 0.18 60 / 40%)" }}>
      <Clock size={10} /> 審査中
    </span>
  );
  if (a.claimStatus === "rejected") return (
    <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ background: "oklch(0.63 0.26 22 / 15%)", color: "var(--primary)", border: "1px solid oklch(0.63 0.26 22 / 35%)" }}>
      <XCircle size={10} /> 却下
    </span>
  );
  return null;
}

export function AchievementsClient() {
  const [data, setData]     = useState<{ achievements: Achievement[]; earnedPts: number; totalPts: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded,      setExpanded]      = useState<string | null>(null);
  const [claiming,      setClaiming]      = useState<string | null>(null);
  const [claimFiles,    setClaimFiles]    = useState<Record<string, File | null>>({});
  const [claimMessages, setClaimMessages] = useState<Record<string, string>>({});
  const [previews,      setPreviews]      = useState<Record<string, string>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetch("/api/achievements")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  function handleFileChange(id: string, file: File | null) {
    setClaimFiles((p) => ({ ...p, [id]: file }));
    if (previews[id]) URL.revokeObjectURL(previews[id]);
    if (file) setPreviews((p) => ({ ...p, [id]: URL.createObjectURL(file) }));
    else      setPreviews((p) => { const n = { ...p }; delete n[id]; return n; });
  }

  async function handleClaim(id: string) {
    setClaiming(id);
    const fd = new FormData();
    fd.append("achievement_id", id);
    fd.append("message", claimMessages[id] ?? "");
    const file = claimFiles[id];
    if (file) fd.append("file", file);

    await fetch("/api/achievements/claim", { method: "POST", body: fd });
    const res = await fetch("/api/achievements");
    setData(await res.json());
    setClaiming(null);
  }

  if (loading) return (
    <div className="px-4 py-16 flex justify-center">
      <Loader2 size={28} className="animate-spin text-primary" />
    </div>
  );
  if (!data) return null;

  const { achievements, earnedPts, totalPts } = data;
  const { rank, pct } = calcAchievementRank(earnedPts, totalPts);

  // 次のランクを計算
  const currentRankIdx = ACHIEVEMENT_RANKS.findIndex((r) => r.key === rank.key);
  const nextRank = currentRankIdx > 0 ? ACHIEVEMENT_RANKS[currentRankIdx - 1] : null;
  const ptsToNext = nextRank ? Math.ceil(totalPts * nextRank.minPct / 100) - earnedPts : 0;

  const grouped = Object.entries(CATEGORY_META).map(([key, meta]) => ({
    key, meta,
    items: achievements.filter((a) => a.category === key),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="px-4 py-4 space-y-5 animate-page-in pb-28">
      <div className="space-y-0.5">
        <p className="label-gaming">achievements</p>
        <p className="text-xs text-muted-foreground">ミッションを達成してランクアップ！</p>
      </div>

      {/* ランクカード */}
      <div
        className="card-elevated rounded-2xl p-5 space-y-4"
        style={{ borderColor: "oklch(0.63 0.26 22 / 35%)" }}
      >
        {/* ランク名と達成率 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black tracking-[0.2em] uppercase text-muted-foreground mb-1">現在のランク</p>
            <p className="text-2xl font-black" style={{ color: "var(--primary)", textShadow: "var(--shadow-neon)" }}>
              {rank.name}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{earnedPts} / {totalPts} pt 達成</p>
          </div>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: `conic-gradient(var(--primary) ${pct}%, oklch(1 0 0 / 8%) ${pct}%)`,
              padding: "3px",
            }}
          >
            <div
              className="w-full h-full rounded-full flex items-center justify-center"
              style={{ background: "oklch(0.115 0.014 22)" }}
            >
              <span className="text-lg font-black leading-none">{pct}<span className="text-[10px]">%</span></span>
            </div>
          </div>
        </div>

        {/* プログレスバー */}
        <div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 8%)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg, oklch(0.58 0.26 22) 0%, oklch(0.72 0.22 355) 100%)",
                boxShadow: "0 0 8px var(--primary)",
              }}
            />
          </div>
          {/* ランクマーカー */}
          <div className="flex justify-between mt-1.5">
            {[...ACHIEVEMENT_RANKS].reverse().map((r) => (
              <div key={r.key} className="flex flex-col items-center gap-0.5">
                <div className="w-px h-1.5"
                  style={{ background: pct >= r.minPct ? "var(--primary)" : "oklch(1 0 0 / 18%)" }} />
                <span className="text-[8px] font-bold"
                  style={{ color: pct >= r.minPct ? "var(--primary)" : "var(--muted-foreground)" }}>
                  {r.minPct}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 次のランクまで */}
        {nextRank ? (
          <p className="text-[11px] text-center" style={{ color: "var(--muted-foreground)" }}>
            <span style={{ color: "var(--primary)", fontWeight: 700 }}>{nextRank.name}</span> まであと
            <span className="font-black mx-1" style={{ color: "white" }}>{ptsToNext}pt</span>
          </p>
        ) : (
          <p className="text-[11px] text-center font-bold" style={{ color: "#facc15" }}>
            🏆 最高ランク達成！
          </p>
        )}
      </div>

      {/* カテゴリ別ミッション */}
      {grouped.map(({ key, meta, items }) => {
        const earnedCount = items.filter((a) => a.earned).length;
        const allDone     = earnedCount === items.length;

        return (
          <div key={key} className="space-y-2">
            {/* カテゴリヘッダー */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="text-base">{meta.emoji}</span>
                <span className="text-[11px] font-black uppercase tracking-[0.18em]"
                  style={{ color: allDone ? "#4ade80" : "var(--primary)" }}>
                  {meta.label}
                </span>
              </div>
              <span
                className="text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{
                  background: allDone ? "oklch(0.55 0.18 145 / 20%)" : "oklch(1 0 0 / 6%)",
                  color: allDone ? "#4ade80" : "var(--muted-foreground)",
                  border: `1px solid ${allDone ? "oklch(0.55 0.18 145 / 35%)" : "oklch(1 0 0 / 12%)"}`,
                }}
              >
                {earnedCount} / {items.length}
              </span>
            </div>

            {/* ミッションリスト */}
            <div className="space-y-2">
              {items.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl overflow-hidden transition-all duration-200"
                  style={{
                    background: a.earned
                      ? "linear-gradient(135deg, oklch(0.16 0.03 145 / 40%) 0%, oklch(0.12 0.02 145 / 20%) 100%)"
                      : "linear-gradient(145deg, oklch(0.145 0.016 22) 0%, oklch(0.105 0.010 22) 100%)",
                    border: `1px solid ${a.earned ? "oklch(0.55 0.18 145 / 30%)" : "oklch(1 0 0 / 14%)"}`,
                    boxShadow: a.earned ? "0 0 12px oklch(0.55 0.18 145 / 10%)" : undefined,
                  }}
                >
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                    onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                  >
                    {/* 達成アイコン */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{
                        background: a.earned
                          ? "oklch(0.55 0.18 145 / 20%)"
                          : "oklch(1 0 0 / 6%)",
                        border: `1px solid ${a.earned ? "oklch(0.55 0.18 145 / 40%)" : "oklch(1 0 0 / 15%)"}`,
                      }}>
                      {a.earned
                        ? <CheckCircle2 size={18} style={{ color: "#4ade80" }} />
                        : a.track_type === "auto"
                          ? <span className="text-[14px]">🤖</span>
                          : <Lock size={14} className="text-muted-foreground" />}
                    </div>

                    {/* テキスト */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold leading-tight"
                        style={{ color: a.earned ? "white" : "rgba(255,255,255,0.85)" }}>
                        {a.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px]" style={{ color: "#facc15" }}>
                          {STARS(a.difficulty)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {a.points}pt · +{a.chip_reward.toLocaleString()}chip
                        </span>
                      </div>
                    </div>

                    {/* バッジ + 展開 */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <StatusBadge a={a} />
                      {expanded === a.id
                        ? <ChevronUp size={14} className="text-muted-foreground" />
                        : <ChevronDown size={14} className="text-muted-foreground" />}
                    </div>
                  </button>

                  {/* 展開コンテンツ */}
                  {expanded === a.id && (
                    <div className="px-4 pb-4 pt-3 space-y-3"
                      style={{ borderTop: "1px solid oklch(1 0 0 / 8%)" }}>
                      <p className="text-xs text-muted-foreground leading-relaxed">{a.description}</p>

                      <div className="flex flex-wrap gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                          {TRACK_LABEL[a.track_type]}
                        </span>
                        {a.earned && a.earnedAt && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: "oklch(0.55 0.18 145 / 15%)", color: "#4ade80" }}>
                            ✓ {new Date(a.earnedAt).toLocaleDateString("ja-JP")} 達成
                          </span>
                        )}
                      </div>

                      {/* 申請フォーム（auto以外・未達成・未申請） */}
                      {a.track_type !== "auto" && !a.earned && a.claimStatus !== "pending" && (
                        <div className="space-y-2.5 pt-1">
                          <p className="text-[10px] text-muted-foreground">
                            {a.track_type === "staff_grant"
                              ? "来店中に達成したら写真とコメントで申請してください。スタッフが確認後に承認します。"
                              : "達成の証拠画像を選択して申請してください。スタッフが確認後に承認します。"}
                          </p>

                          {/* 隠しfile input */}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={(el) => { fileRefs.current[a.id] = el; }}
                            onChange={(e) => handleFileChange(a.id, e.target.files?.[0] ?? null)}
                          />

                          {/* 画像プレビュー or 選択ボタン */}
                          {previews[a.id] ? (
                            <div className="relative">
                              <img
                                src={previews[a.id]}
                                alt="証拠画像"
                                className="w-full rounded-xl object-cover"
                                style={{ maxHeight: "160px" }}
                              />
                              <button
                                onClick={() => handleFileChange(a.id, null)}
                                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
                                style={{ background: "rgba(0,0,0,0.6)" }}
                              >
                                <X size={12} className="text-white" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => fileRefs.current[a.id]?.click()}
                              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-xs font-bold interactive"
                              style={{ borderColor: "oklch(1 0 0 / 18%)", color: "var(--muted-foreground)" }}
                            >
                              <ImagePlus size={16} />
                              写真を選択
                            </button>
                          )}

                          {/* メッセージ */}
                          <input
                            className="w-full rounded-lg bg-secondary border border-border text-xs px-3 py-2 focus:outline-none focus:border-primary"
                            placeholder="一言メッセージ（任意）"
                            value={claimMessages[a.id] ?? ""}
                            onChange={(e) => setClaimMessages((p) => ({ ...p, [a.id]: e.target.value }))}
                          />

                          {/* 申請ボタン */}
                          <button
                            onClick={() => handleClaim(a.id)}
                            disabled={claiming === a.id}
                            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white interactive"
                            style={{ background: "var(--primary)", boxShadow: "var(--shadow-neon)" }}
                          >
                            {claiming === a.id
                              ? <Loader2 size={12} className="animate-spin" />
                              : <Send size={12} />}
                            達成を申請する
                          </button>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
