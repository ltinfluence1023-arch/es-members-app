"use client";

import { useEffect, useState } from "react";
import { Trophy, CheckCircle2, Loader2 } from "lucide-react";

interface Achievement {
  id: string; name: string; category: string; difficulty: number;
  chip_reward: number; track_type: string; is_active: boolean;
}

interface UserAchievement { achievement_id: string }

const CATEGORY_LABELS: Record<string, string> = {
  visit: "来店", social: "交流", game: "ゲーム", sns: "SNS", community: "コミュニティ",
};

export function AdminAchievementGrant({ userId }: { userId: string }) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [earned,       setEarned]       = useState<Set<string>>(new Set());
  const [granting,     setGranting]     = useState<string | null>(null);
  const [note,         setNote]         = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/achievements").then((r) => r.json()),
      fetch(`/api/admin/achievements/user/${userId}`).then((r) => r.json()),
    ]).then(([all, userEarned]: [Achievement[], UserAchievement[]]) => {
      setAchievements(all.filter((a) => a.is_active && a.track_type !== "auto"));
      setEarned(new Set(userEarned.map((e) => e.achievement_id)));
    });
  }, [userId]);

  async function handleGrant(achievementId: string) {
    setGranting(achievementId);
    const res = await fetch("/api/admin/achievements/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, achievement_id: achievementId, note }),
    });
    if (res.ok) {
      setEarned((prev) => new Set([...prev, achievementId]));
      setNote("");
    }
    setGranting(null);
  }

  const grantable = achievements.filter((a) => !earned.has(a.id));
  const done      = achievements.filter((a) =>  earned.has(a.id));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Trophy size={16} style={{ color: "var(--primary)" }} />
        <p className="font-bold text-sm">アチーブメント付与</p>
      </div>

      {grantable.length === 0 ? (
        <p className="text-xs text-muted-foreground">付与可能なミッションがありません</p>
      ) : (
        <div className="space-y-2">
          <input
            className="w-full rounded-lg bg-background border border-border text-xs px-3 py-2 focus:outline-none focus:border-primary"
            placeholder="付与メモ（任意）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="space-y-1.5 max-h-52 overflow-y-auto no-scrollbar">
            {Object.entries(CATEGORY_LABELS).map(([cat, catLabel]) => {
              const items = grantable.filter((a) => a.category === cat);
              if (!items.length) return null;
              return (
                <div key={cat}>
                  <p className="text-[10px] text-muted-foreground font-bold mb-1">{catLabel}</p>
                  {items.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => handleGrant(a.id)}
                      disabled={granting === a.id}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left interactive mb-1"
                      style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
                    >
                      <span className="text-xs font-medium">{a.name}</span>
                      <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-shrink-0">
                        +{a.chip_reward}chip
                        {granting === a.id
                          ? <Loader2 size={11} className="animate-spin" />
                          : <span className="text-primary font-bold">付与</span>}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {done.length > 0 && (
        <details>
          <summary className="text-[10px] text-muted-foreground cursor-pointer">達成済み ({done.length}件)</summary>
          <div className="mt-1.5 space-y-1">
            {done.map((a) => (
              <div key={a.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg opacity-60"
                style={{ background: "var(--secondary)" }}>
                <CheckCircle2 size={12} style={{ color: "#4ade80" }} />
                <span className="text-xs">{a.name}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
