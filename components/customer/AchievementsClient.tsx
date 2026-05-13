"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp, Loader2, Send } from "lucide-react";
import { calcAchievementRank, ACHIEVEMENT_RANKS } from "@/lib/utils/achievementRank";

interface Achievement {
  id: string; code: string; name: string; description: string;
  category: string; difficulty: number; points: number; chip_reward: number;
  track_type: string;
  earned: boolean; earnedAt: string | null; claimStatus: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  visit: "🗓 来店", social: "🤝 交流", game: "🎲 ゲーム", sns: "📱 SNS", community: "🌟 コミュニティ",
};

const STARS = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

function StatusBadge({ a }: { a: Achievement }) {
  if (a.earned) return (
    <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
      style={{ background: "oklch(0.55 0.18 145 / 20%)", color: "#4ade80", border: "1px solid oklch(0.55 0.18 145 / 35%)" }}>
      <CheckCircle2 size={10} /> 達成
    </span>
  );
  if (a.claimStatus === "pending") return (
    <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
      style={{ background: "oklch(0.65 0.18 60 / 20%)", color: "#facc15", border: "1px solid oklch(0.65 0.18 60 / 35%)" }}>
      <Clock size={10} /> 審査中
    </span>
  );
  if (a.claimStatus === "rejected") return (
    <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
      style={{ background: "oklch(0.63 0.26 22 / 15%)", color: "var(--primary)", border: "1px solid oklch(0.63 0.26 22 / 30%)" }}>
      <XCircle size={10} /> 却下
    </span>
  );
  return null;
}

export function AchievementsClient() {
  const [data, setData]       = useState<{ achievements: Achievement[]; earnedPts: number; totalPts: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimInputs, setClaimInputs] = useState<Record<string, { url: string; msg: string }>>({});

  useEffect(() => {
    fetch("/api/achievements")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  async function handleClaim(id: string) {
    setClaiming(id);
    const input = claimInputs[id] ?? { url: "", msg: "" };
    await fetch("/api/achievements/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ achievement_id: id, proof_url: input.url, message: input.msg }),
    });
    const res = await fetch("/api/achievements");
    setData(await res.json());
    setClaiming(null);
  }

  if (loading) return (
    <div className="px-4 py-10 flex justify-center"><Loader2 size={24} className="animate-spin text-primary" /></div>
  );
  if (!data) return null;

  const { achievements, earnedPts, totalPts } = data;
  const { rank, pct } = calcAchievementRank(earnedPts, totalPts);

  // カテゴリ別にグループ化
  const grouped = Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
    key, label,
    items: achievements.filter((a) => a.category === key),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="px-4 py-4 space-y-5 animate-page-in pb-24">
      <div className="space-y-1">
        <p className="label-gaming">achievements</p>
        <p className="text-xs text-muted-foreground">ミッションを達成してランクアップ！</p>
      </div>

      {/* ランクカード */}
      <div className="card-elevated rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xl font-black" style={{ color: "var(--primary)" }}>{rank.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{earnedPts} / {totalPts} pt</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black">{pct}<span className="text-lg">%</span></p>
            <p className="text-[10px] text-muted-foreground">達成率</p>
          </div>
        </div>
        {/* プログレスバー */}
        <div className="space-y-1.5">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 8%)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg, var(--primary) 0%, oklch(0.70 0.22 355) 100%)",
                boxShadow: "var(--shadow-neon)",
              }}
            />
          </div>
          {/* ランクマーカー */}
          <div className="flex justify-between">
            {ACHIEVEMENT_RANKS.slice().reverse().map((r) => (
              <div key={r.key} className="flex flex-col items-center gap-0.5">
                <div className="w-px h-1.5" style={{ background: pct >= r.minPct ? "var(--primary)" : "oklch(1 0 0 / 20%)" }} />
                <span className="text-[8px]" style={{ color: pct >= r.minPct ? "var(--primary)" : "var(--muted-foreground)" }}>
                  {r.minPct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* カテゴリ別ミッション一覧 */}
      {grouped.map(({ key, label, items }) => {
        const earnedCount = items.filter((a) => a.earned).length;
        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="label-gaming text-xs">{label}</p>
              <span className="text-[10px] text-muted-foreground">{earnedCount}/{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((a) => (
                <div key={a.id} className="card-elevated rounded-xl overflow-hidden"
                  style={{ opacity: a.earned ? 1 : 0.85 }}>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                  >
                    {/* 達成チェック */}
                    <div className="flex-shrink-0">
                      {a.earned
                        ? <CheckCircle2 size={20} style={{ color: "#4ade80" }} />
                        : <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: "oklch(1 0 0 / 25%)" }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold leading-tight">{a.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {STARS(a.difficulty)} · {a.points}pt · +{a.chip_reward}chip
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge a={a} />
                      {expanded === a.id
                        ? <ChevronUp size={14} className="text-muted-foreground" />
                        : <ChevronDown size={14} className="text-muted-foreground" />}
                    </div>
                  </button>

                  {expanded === a.id && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                      <p className="text-xs text-muted-foreground">{a.description}</p>
                      <div className="flex gap-3 text-[10px] text-muted-foreground">
                        <span>方式: {a.track_type === "auto" ? "🤖 自動" : a.track_type === "staff_grant" ? "👨‍💼 スタッフ付与" : "📱 本人申請"}</span>
                      </div>
                      {a.earned && a.earnedAt && (
                        <p className="text-[10px] text-green-400">
                          達成日: {new Date(a.earnedAt).toLocaleDateString("ja-JP")}
                        </p>
                      )}
                      {/* 申請フォーム（user_claim・未申請） */}
                      {a.track_type === "user_claim" && !a.earned && a.claimStatus !== "pending" && (
                        <div className="space-y-2 pt-1">
                          <input
                            className="w-full rounded-lg bg-secondary border border-border text-xs px-3 py-2 focus:outline-none focus:border-primary"
                            placeholder="証拠URL（任意）"
                            value={claimInputs[a.id]?.url ?? ""}
                            onChange={(e) => setClaimInputs((p) => ({ ...p, [a.id]: { ...p[a.id], url: e.target.value } }))}
                          />
                          <input
                            className="w-full rounded-lg bg-secondary border border-border text-xs px-3 py-2 focus:outline-none focus:border-primary"
                            placeholder="メッセージ（任意）"
                            value={claimInputs[a.id]?.msg ?? ""}
                            onChange={(e) => setClaimInputs((p) => ({ ...p, [a.id]: { ...p[a.id], msg: e.target.value } }))}
                          />
                          <button
                            onClick={() => handleClaim(a.id)}
                            disabled={claiming === a.id}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white interactive"
                            style={{ background: "var(--primary)" }}
                          >
                            {claiming === a.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                            申請する
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
