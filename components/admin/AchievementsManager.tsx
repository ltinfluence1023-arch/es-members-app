"use client";

import { useEffect, useState } from "react";
import { ToggleLeft, ToggleRight, Loader2, Users, ChevronDown, ChevronUp } from "lucide-react";

interface Achievement {
  id: string; code: string; name: string; description: string;
  category: string; difficulty: number; points: number;
  chip_reward: number; track_type: string; is_active: boolean;
  sort_order: number; earnedCount: number;
}

interface Claim {
  id: string; user_id: string; achievement_id: string;
  proof_url: string | null; message: string | null;
  status: string; claimed_at: string; review_note: string | null;
  achievements: { name: string; chip_reward: number } | null;
  users: { nickname: string } | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  visit: "来店", social: "交流", game: "ゲーム", sns: "SNS", community: "コミュニティ",
};
const TRACK_LABELS: Record<string, string> = {
  auto: "🤖自動", staff_grant: "👨‍💼スタッフ", user_claim: "📱申請",
};
const STARS = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export function AchievementsManager({ isMaster }: { isMaster: boolean }) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [claims,       setClaims]       = useState<Claim[]>([]);
  const [tab,          setTab]          = useState<"list" | "claims">("list");
  const [expanded,     setExpanded]     = useState<string | null>(null);
  const [editing,      setEditing]      = useState<Record<string, { pts: string; chip: string }>>({});
  const [saving,       setSaving]       = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/achievements").then((r) => r.json()),
      fetch("/api/admin/achievements/claims").then((r) => r.json()),
    ]).then(([a, c]) => { setAchievements(a); setClaims(c); setLoading(false); });
  }, []);

  async function handleToggle(a: Achievement) {
    await fetch(`/api/admin/achievements/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !a.is_active }),
    });
    setAchievements((prev) => prev.map((x) => x.id === a.id ? { ...x, is_active: !x.is_active } : x));
  }

  async function handleSavePts(a: Achievement) {
    const ed = editing[a.id];
    if (!ed) return;
    setSaving(a.id);
    await fetch(`/api/admin/achievements/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points: parseInt(ed.pts), chip_reward: parseInt(ed.chip) }),
    });
    setAchievements((prev) => prev.map((x) =>
      x.id === a.id ? { ...x, points: parseInt(ed.pts), chip_reward: parseInt(ed.chip) } : x
    ));
    setEditing((prev) => { const n = { ...prev }; delete n[a.id]; return n; });
    setSaving(null);
  }

  async function handleClaim(claimId: string, action: "approved" | "rejected", note?: string) {
    await fetch("/api/admin/achievements/claims", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim_id: claimId, action, review_note: note }),
    });
    setClaims((prev) => prev.map((c) => c.id === claimId ? { ...c, status: action } : c));
  }

  if (loading) return (
    <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-primary" /></div>
  );

  const pendingCount = claims.filter((c) => c.status === "pending").length;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-black heading-gaming">アチーブメント管理</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {isMaster ? "pt・チップ報酬の変更、有効/無効の切替が可能です" : "有効/無効の切替と付与が可能です"}
        </p>
      </div>

      {/* タブ */}
      <div className="flex gap-2">
        {[
          { key: "list",   label: "ミッション一覧" },
          { key: "claims", label: `申請レビュー${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as "list" | "claims")}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{
              background: tab === key ? "var(--primary)" : "var(--secondary)",
              color: tab === key ? "white" : "var(--muted-foreground)",
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── ミッション一覧 ── */}
      {tab === "list" && (
        <div className="space-y-2">
          {achievements.map((a) => {
            const ed = editing[a.id];
            const isExpanded = expanded === a.id;
            return (
              <div key={a.id} className="card-elevated rounded-xl overflow-hidden"
                style={{ opacity: a.is_active ? 1 : 0.5 }}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{a.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {CATEGORY_LABELS[a.category]} · {STARS(a.difficulty)} · {TRACK_LABELS[a.track_type]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Users size={11} />{a.earnedCount}人
                  </div>
                  {isMaster && (
                    <button onClick={() => handleToggle(a)} className="p-1 rounded-lg hover:bg-secondary">
                      {a.is_active
                        ? <ToggleRight size={20} style={{ color: "#4ade80" }} />
                        : <ToggleLeft  size={20} className="text-muted-foreground" />}
                    </button>
                  )}
                  <button onClick={() => setExpanded(isExpanded ? null : a.id)}
                    className="p-1 rounded-lg hover:bg-secondary">
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-border px-4 py-3 space-y-3 bg-secondary/20">
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                    {isMaster ? (
                      <div className="flex gap-3 items-end">
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-1">pt</label>
                          <input type="number" min={0}
                            className="w-20 rounded-lg bg-secondary border border-border text-sm px-2 py-1.5 focus:outline-none focus:border-primary"
                            value={ed?.pts ?? String(a.points)}
                            onChange={(e) => setEditing((p) => ({ ...p, [a.id]: { pts: e.target.value, chip: p[a.id]?.chip ?? String(a.chip_reward) } }))}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-1">チップ報酬</label>
                          <input type="number" min={0}
                            className="w-24 rounded-lg bg-secondary border border-border text-sm px-2 py-1.5 focus:outline-none focus:border-primary"
                            value={ed?.chip ?? String(a.chip_reward)}
                            onChange={(e) => setEditing((p) => ({ ...p, [a.id]: { chip: e.target.value, pts: p[a.id]?.pts ?? String(a.points) } }))}
                          />
                        </div>
                        {ed && (
                          <button onClick={() => handleSavePts(a)} disabled={saving === a.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white interactive"
                            style={{ background: "var(--primary)" }}>
                            {saving === a.id ? <Loader2 size={12} className="animate-spin" /> : "保存"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">{a.points}pt · +{a.chip_reward}chip（マスターのみ変更可）</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── 申請レビュー ── */}
      {tab === "claims" && (
        <div className="space-y-2">
          {claims.filter((c) => c.status === "pending").length === 0 && (
            <div className="card-elevated rounded-xl p-6 text-center text-sm text-muted-foreground">
              未処理の申請はありません
            </div>
          )}
          {claims.filter((c) => c.status === "pending").map((c) => (
            <div key={c.id} className="card-elevated rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold">{c.achievements?.name}</p>
                  <p className="text-xs text-muted-foreground">{c.users?.nickname} 様</p>
                </div>
                <span className="text-[10px] text-yellow-400 font-black bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/30">
                  審査中
                </span>
              </div>
              {c.proof_url && (
                <a href={c.proof_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary underline break-all">
                  証拠URL: {c.proof_url}
                </a>
              )}
              {c.message && <p className="text-xs text-muted-foreground">「{c.message}」</p>}
              <div className="flex gap-2">
                <button onClick={() => handleClaim(c.id, "approved")}
                  className="flex-1 py-2 rounded-lg text-xs font-bold text-white interactive"
                  style={{ background: "oklch(0.55 0.18 145)" }}>
                  承認
                </button>
                <button onClick={() => handleClaim(c.id, "rejected")}
                  className="flex-1 py-2 rounded-lg text-xs font-bold interactive"
                  style={{ background: "var(--destructive)", color: "white" }}>
                  却下
                </button>
              </div>
            </div>
          ))}
          {/* 処理済みの申請 */}
          {claims.filter((c) => c.status !== "pending").length > 0 && (
            <details className="mt-4">
              <summary className="text-xs text-muted-foreground cursor-pointer py-2">処理済み ({claims.filter((c) => c.status !== "pending").length}件)</summary>
              <div className="space-y-2 mt-2">
                {claims.filter((c) => c.status !== "pending").map((c) => (
                  <div key={c.id} className="card-elevated rounded-xl px-4 py-3 flex items-center gap-3 opacity-60">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{c.achievements?.name}</p>
                      <p className="text-xs text-muted-foreground">{c.users?.nickname}</p>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${c.status === "approved" ? "text-green-400" : "text-destructive"}`}>
                      {c.status === "approved" ? "承認済" : "却下"}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
