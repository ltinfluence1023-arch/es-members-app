import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChipCard } from "@/components/customer/ChipCard";
import { TodayRanking } from "@/components/customer/TodayRanking";
import { LiveAtStore } from "@/components/customer/LiveAtStore";
import { ActivityFeed, type ActivityEvent } from "@/components/customer/ActivityFeed";
import { Bell, ArrowLeftRight, Activity, Gem, ChevronRight, HelpCircle, CheckCircle2, Trophy } from "lucide-react";
import { getBusinessDayStartUTC } from "@/lib/utils/businessDay";
import { fetchAchievementProgress } from "@/lib/utils/autoAchievements";
import { calcAchievementRank } from "@/lib/utils/achievementRank";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface UserWithRank {
  nickname: string;
  chip_balance: number;
  point_balance: number;
  total_visit_count: number;
  ranks: { name: string } | null;
}

const ACTION_BUTTONS = [
  { icon: Bell,           label: "お知らせ",    href: "/notices" },
  { icon: ArrowLeftRight, label: "QR転送",      href: "/qr" },
  { icon: Activity,       label: "チップ履歴",  href: "/history?tab=chip" },
  { icon: Gem,            label: "ポイント履歴", href: "/history?tab=point" },
] as const;

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminClient     = createAdminClient();
  const businessDayStart = getBusinessDayStartUTC();
  const businessDayTs   = businessDayStart.getTime();

  const [
    { data: userData },
    { data: notices },
    { data: myQuizAnswer },
    { earnedPts, totalPts },
    { data: visitRows },
    { data: quizCorrectRows },
    { data: achievementRows },
  ] = await Promise.all([
    adminClient
      .from("users")
      .select("nickname, chip_balance, point_balance, total_visit_count, ranks(name)")
      .eq("id", user.id)
      .single(),
    adminClient
      .from("notices")
      .select("id, title")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(1),
    // 自分の本日のクイズ回答
    adminClient
      .from("quiz_answers")
      .select("id, is_correct")
      .eq("user_id", user.id)
      .eq("business_day_ts", businessDayTs)
      .maybeSingle(),
    fetchAchievementProgress(user.id),
    // アクティビティ: 本日チェックイン
    adminClient
      .from("visits")
      .select("user_id, checked_in_at")
      .gte("checked_in_at", businessDayStart.toISOString())
      .order("checked_in_at", { ascending: false })
      .limit(8),
    // アクティビティ: 本日クイズ正解
    adminClient
      .from("quiz_answers")
      .select("user_id, answered_at")
      .eq("business_day_ts", businessDayTs)
      .eq("is_correct", true)
      .order("answered_at", { ascending: false })
      .limit(8),
    // アクティビティ: 本日アチーブメント達成
    adminClient
      .from("user_achievements")
      .select("user_id, achieved_at, achievement_id")
      .gte("achieved_at", businessDayStart.toISOString())
      .order("achieved_at", { ascending: false })
      .limit(8),
  ]);

  // ── アクティビティ: ユーザー情報をまとめて取得 ──────────────
  const allUserIds = [...new Set([
    ...(visitRows        ?? []).map((r) => r.user_id),
    ...(quizCorrectRows  ?? []).map((r) => r.user_id),
    ...(achievementRows  ?? []).map((r) => r.user_id),
  ])];

  const achievementIds = [...new Set((achievementRows ?? []).map((r) => r.achievement_id))];

  const [{ data: activityUsers }, { data: achievementDetails }] = await Promise.all([
    allUserIds.length > 0
      ? adminClient.from("users").select("id, nickname, avatar_url").in("id", allUserIds)
      : Promise.resolve({ data: [] }),
    achievementIds.length > 0
      ? adminClient.from("achievements").select("id, name").in("id", achievementIds)
      : Promise.resolve({ data: [] }),
  ]);

  const userMap = new Map((activityUsers ?? []).map((u) => [u.id, u]));
  const achMap  = new Map((achievementDetails ?? []).map((a) => [a.id, a.name]));

  const activityEvents: ActivityEvent[] = [
    ...(visitRows ?? []).map((r) => ({
      type:      "checkin" as const,
      userId:    r.user_id,
      nickname:  userMap.get(r.user_id)?.nickname ?? "—",
      avatarUrl: userMap.get(r.user_id)?.avatar_url ?? null,
      detail:    "チェックイン",
      timestamp: r.checked_in_at,
    })),
    ...(quizCorrectRows ?? []).map((r) => ({
      type:      "quiz" as const,
      userId:    r.user_id,
      nickname:  userMap.get(r.user_id)?.nickname ?? "—",
      avatarUrl: userMap.get(r.user_id)?.avatar_url ?? null,
      detail:    "クイズに正解！",
      timestamp: r.answered_at,
    })),
    ...(achievementRows ?? []).map((r) => ({
      type:      "achievement" as const,
      userId:    r.user_id,
      nickname:  userMap.get(r.user_id)?.nickname ?? "—",
      avatarUrl: userMap.get(r.user_id)?.avatar_url ?? null,
      detail:    `「${achMap.get(r.achievement_id) ?? "ミッション"}」を達成！`,
      timestamp: r.achieved_at,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
   .slice(0, 12);

  // ── 既存データ ───────────────────────────────────────────
  const typedUser      = userData as UserWithRank | null;
  const rankName       = typedUser?.ranks?.name ?? null;
  const latestNotice   = notices?.[0] ?? null;
  const quizCompleted  = !!myQuizAnswer;
  const myQuizCorrect  = myQuizAnswer?.is_correct ?? false;
  const { rank: achievementRank, pct: achievementPct } = calcAchievementRank(earnedPts, totalPts);

  return (
    <div className="px-4 py-4 space-y-4 animate-page-in">

      {/* Latest notice ticker */}
      {latestNotice && (
        <Link href={`/notices/${latestNotice.id}`} className="block interactive">
          <div
            className="card-elevated rounded-xl px-3.5 py-3 flex items-center gap-3"
            style={{ borderColor: "oklch(0.63 0.26 22 / 35%)" }}
          >
            <span
              className="flex-shrink-0 text-[10px] font-black tracking-[0.22em] uppercase px-2 py-1 rounded-sm"
              style={{ background: "var(--primary)", color: "#fff", boxShadow: "0 0 12px oklch(0.65 0.26 22 / 50%)" }}
            >
              NEW
            </span>
            <p className="text-[14px] font-bold truncate flex-1 leading-tight">{latestNotice.title}</p>
            <ChevronRight size={16} style={{ color: "var(--primary)" }} className="flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* Chip + Point card */}
      <ChipCard
        chipBalance={typedUser?.chip_balance ?? 0}
        pointBalance={typedUser?.point_balance ?? 0}
        visitCount={typedUser?.total_visit_count ?? 0}
        nickname={typedUser?.nickname ?? ""}
        rankName={rankName}
        userId={user.id}
        achievementRankKey={achievementRank.key}
        achievementPct={achievementPct}
      />

      {/* Action buttons */}
      <div className="space-y-2.5 pt-1">
        <p className="label-gaming">menu</p>

        {/* デイリークイズ */}
        <Link href="/quiz" className="block interactive">
          <div
            className="card-elevated rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{ borderColor: quizCompleted ? "oklch(0.55 0.18 145 / 35%)" : "oklch(0.63 0.26 22 / 40%)" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: quizCompleted
                  ? "oklch(0.55 0.18 145 / 20%)"
                  : "linear-gradient(135deg, var(--primary) 0%, oklch(0.50 0.24 22) 100%)",
                boxShadow: quizCompleted ? undefined : "var(--shadow-neon)",
              }}
            >
              {quizCompleted
                ? <CheckCircle2 size={20} style={{ color: "#4ade80" }} />
                : <HelpCircle   size={20} className="text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight">デイリークイズ</p>
              <p className="text-xs leading-tight mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                {quizCompleted
                  ? myQuizCorrect ? "正解！ +10チップ獲得済み 🎉" : "本日回答済み"
                  : "毎日1問・正解で +10チップ"}
              </p>
            </div>
            {quizCompleted ? (
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ background: "oklch(0.55 0.18 145 / 20%)", color: "#4ade80", border: "1px solid oklch(0.55 0.18 145 / 35%)" }}>
                完了
              </span>
            ) : (
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full flex-shrink-0 animate-pulse"
                style={{ background: "oklch(0.63 0.26 22 / 20%)", color: "var(--primary)", border: "1px solid oklch(0.63 0.26 22 / 45%)" }}>
                未了
              </span>
            )}
            <ChevronRight size={15} className="flex-shrink-0 text-muted-foreground" />
          </div>
        </Link>

        {/* アチーブメント */}
        <Link href="/achievements" className="block interactive">
          <div
            className="card-elevated rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{ borderColor: "oklch(0.63 0.26 22 / 30%)" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: earnedPts > 0
                  ? "linear-gradient(135deg, oklch(0.55 0.22 60) 0%, oklch(0.45 0.20 55) 100%)"
                  : "oklch(1 0 0 / 8%)",
                boxShadow: earnedPts > 0 ? "0 0 12px oklch(0.55 0.22 60 / 40%)" : undefined,
              }}
            >
              <Trophy size={20} style={{ color: earnedPts > 0 ? "#facc15" : "rgba(255,255,255,0.4)" }} />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold leading-tight">アチーブメント</p>
                <span className="text-[11px] font-black" style={{ color: "var(--primary)" }}>
                  {achievementRank.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 8%)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${achievementPct}%`,
                      background: "linear-gradient(90deg, oklch(0.58 0.26 22) 0%, oklch(0.72 0.22 355) 100%)",
                    }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                  {earnedPts}/{totalPts}pt
                </span>
              </div>
            </div>
            <ChevronRight size={15} className="flex-shrink-0 text-muted-foreground" />
          </div>
        </Link>

        {/* 4列グリッド */}
        <div className="grid grid-cols-4 gap-2.5">
          {ACTION_BUTTONS.map(({ icon: Icon, label, href }) => (
            <Link key={href} href={href} className="flex flex-col items-center gap-1.5 interactive group">
              <div className="w-full aspect-square rounded-2xl flex items-center justify-center card-elevated relative overflow-hidden">
                <div
                  className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity"
                  style={{ background: "radial-gradient(circle at center, oklch(0.63 0.26 22 / 30%) 0%, transparent 70%)" }}
                />
                <Icon
                  size={28}
                  strokeWidth={2.4}
                  style={{ color: "var(--primary)", filter: "drop-shadow(0 0 6px oklch(0.63 0.26 22 / 45%))" }}
                  className="relative transition-transform duration-200 group-active:scale-90"
                />
              </div>
              <span className="text-[11px] font-bold text-center leading-tight tracking-wide w-full px-0.5"
                style={{ color: "rgba(255,255,255,0.85)" }}>
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Today's activity feed */}
      <ActivityFeed events={activityEvents} />

      {/* Live at store */}
      <div className="pt-2">
        <LiveAtStore />
      </div>

      {/* Today's chip ranking */}
      <div className="pt-1 pb-20">
        <TodayRanking myId={user.id} />
      </div>

    </div>
  );
}
