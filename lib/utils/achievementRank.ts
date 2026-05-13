export type AchievementRankKey = "visitor" | "citizen" | "regular" | "ambassador" | "legend";

export interface AchievementRank {
  key:    AchievementRankKey;
  name:   string;
  minPct: number;
}

export const ACHIEVEMENT_RANKS: AchievementRank[] = [
  { key: "legend",     name: "レジェンド国民", minPct: 80 },
  { key: "ambassador", name: "親善大使",       minPct: 60 },
  { key: "regular",    name: "常連市民",       minPct: 40 },
  { key: "citizen",    name: "市民",           minPct: 20 },
  { key: "visitor",    name: "入国者",         minPct: 0  },
];

export function calcAchievementRank(earnedPts: number, totalPts: number) {
  const pct = totalPts > 0 ? (earnedPts / totalPts) * 100 : 0;
  const rank = ACHIEVEMENT_RANKS.find((r) => pct >= r.minPct) ?? ACHIEVEMENT_RANKS[4];
  return { rank, pct: Math.round(pct), earnedPts, totalPts };
}

/** ランクキーに対応するChipCardの gradient/glow スタイル */
export function getRankStyleByKey(key: AchievementRankKey) {
  switch (key) {
    case "legend":
      return {
        gradient: "linear-gradient(135deg, #0f0608 0%, #2a0d14 30%, #8b1a2e 52%, #2a0d14 78%, #0f0608 100%)",
        glow:     "0 0 48px rgba(200,30,70,0.45), 0 10px 36px rgba(0,0,0,0.72)",
        label:    "LEGEND",
        accentColor: "#ff6080",
        pattern:  "radial-gradient(ellipse at 76% 22%, rgba(220,40,80,0.22) 0%, transparent 55%)",
        accentLine: "linear-gradient(90deg, transparent 0%, rgba(255,100,130,0.7) 40%, rgba(255,80,110,0.9) 60%, transparent 100%)",
      };
    case "ambassador":
      return {
        gradient: "linear-gradient(135deg, #140400 0%, #3a1000 28%, #aa2e08 52%, #3a1000 78%, #140400 100%)",
        glow:     "0 0 42px rgba(200,70,15,0.48), 0 10px 34px rgba(0,0,0,0.70)",
        label:    "AMBASSADOR",
        accentColor: "#ff7040",
        pattern:  "radial-gradient(ellipse at 76% 22%, rgba(200,70,15,0.24) 0%, transparent 55%)",
        accentLine: "linear-gradient(90deg, transparent 0%, rgba(255,100,50,0.7) 40%, rgba(255,80,30,0.9) 60%, transparent 100%)",
      };
    case "regular":
      return {
        gradient: "linear-gradient(135deg, #0e0508 0%, #200c12 30%, #5a1e2c 52%, #200c12 78%, #0e0508 100%)",
        glow:     "0 0 34px rgba(160,30,60,0.40), 0 10px 30px rgba(0,0,0,0.70)",
        label:    "REGULAR",
        accentColor: "#e08090",
        pattern:  "radial-gradient(ellipse at 76% 22%, rgba(160,40,70,0.20) 0%, transparent 55%)",
        accentLine: "linear-gradient(90deg, transparent 0%, rgba(200,80,100,0.6) 40%, rgba(200,60,90,0.85) 60%, transparent 100%)",
      };
    case "citizen":
      return {
        gradient: "linear-gradient(135deg, #0c0405 0%, #1c0a09 30%, #481510 52%, #1c0a09 78%, #0c0405 100%)",
        glow:     "0 0 28px rgba(140,30,20,0.38), 0 10px 26px rgba(0,0,0,0.68)",
        label:    "CITIZEN",
        accentColor: "#d07060",
        pattern:  "radial-gradient(ellipse at 76% 22%, rgba(140,40,30,0.20) 0%, transparent 55%)",
        accentLine: "linear-gradient(90deg, transparent 0%, rgba(180,60,50,0.6) 40%, rgba(180,50,40,0.85) 60%, transparent 100%)",
      };
    default: // visitor
      return {
        gradient: "linear-gradient(135deg, #0d0507 0%, #1b0b10 35%, #2c1016 65%, #1b0b10 100%)",
        glow:     "0 0 22px rgba(120,20,40,0.28), 0 8px 22px rgba(0,0,0,0.65)",
        label:    "VISITOR",
        accentColor: "#e05070",
        pattern:  "radial-gradient(ellipse at 76% 22%, rgba(180,30,60,0.14) 0%, transparent 55%)",
        accentLine: "linear-gradient(90deg, transparent 0%, rgba(160,40,70,0.5) 40%, rgba(160,30,60,0.75) 60%, transparent 100%)",
      };
  }
}
