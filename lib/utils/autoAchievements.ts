import { createAdminClient } from "@/lib/supabase/admin";

export type AchievementTrigger = "checkin" | "transfer" | "profile";

/**
 * 自動ミッションをチェックし、条件を満たしたものを付与する。
 * エラーは握りつぶし、本体処理を阻害しない。
 */
export async function checkAutoAchievements(
  userId: string,
  trigger: AchievementTrigger,
): Promise<void> {
  try {
    const adminClient = createAdminClient();

    const { data: allAuto } = await adminClient
      .from("achievements")
      .select("id, code, points, chip_reward, name")
      .eq("track_type", "auto")
      .eq("is_active", true);

    if (!allAuto?.length) return;

    const { data: alreadyEarned } = await adminClient
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", userId);

    const earnedSet = new Set(alreadyEarned?.map((e) => e.achievement_id) ?? []);
    const unearned = allAuto.filter((a) => !earnedSet.has(a.id));
    if (!unearned.length) return;

    const { data: userData } = await adminClient
      .from("users")
      .select("birthday, nickname")
      .eq("id", userId)
      .single();

    const { data: visits } = await adminClient
      .from("visits")
      .select("checked_in_at")
      .eq("user_id", userId)
      .order("checked_in_at", { ascending: false })
      .limit(60);

    const { data: transfers } = trigger === "transfer"
      ? await adminClient
          .from("chip_transactions")
          .select("id")
          .eq("from_user_id", userId)
          .eq("type", "transfer")
          .limit(1)
      : { data: null };

    const toGrant: typeof allAuto = [];

    for (const ach of unearned) {
      let earned = false;

      switch (ach.code) {
        case "first_checkin":
          earned = trigger === "checkin" && (visits?.length ?? 0) === 1;
          break;

        case "weekday_visit":
          if (trigger === "checkin") {
            const nowJST = new Date(Date.now() + 9 * 3600 * 1000);
            const day = nowJST.getUTCDay();
            earned = day >= 1 && day <= 4;
          }
          break;

        case "monthly_3visits":
          if (trigger === "checkin" && visits?.length) {
            const now = new Date();
            const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
            const count = visits.filter((v) => new Date(v.checked_in_at) >= monthStart).length;
            earned = count >= 3;
          }
          break;

        case "two_week_streak":
          if (trigger === "checkin" && visits?.length) {
            const now = new Date();
            const weekMs = 7 * 86_400_000;
            const sundayMs = now.getTime() - now.getUTCDay() * 86_400_000;
            const thisWeekStart = new Date(sundayMs);
            const prevWeekStart = new Date(sundayMs - weekMs);

            const inThisWeek = visits.some((v) => new Date(v.checked_in_at) >= thisWeekStart);
            const inPrevWeek = visits.some((v) => {
              const d = new Date(v.checked_in_at);
              return d >= prevWeekStart && d < thisWeekStart;
            });
            earned = inThisWeek && inPrevWeek;
          }
          break;

        case "birthday_visit":
          if (trigger === "checkin" && userData?.birthday) {
            const birthMonth = parseInt(userData.birthday.split("-")[1], 10);
            earned = new Date().getMonth() + 1 === birthMonth;
          }
          break;

        case "set_nickname":
          earned = trigger === "profile" && !!userData?.nickname?.trim();
          break;

        case "chip_transfer":
          earned = trigger === "transfer" && (transfers?.length ?? 0) > 0;
          break;
      }

      if (earned) toGrant.push(ach);
    }

    if (!toGrant.length) return;

    await adminClient.from("user_achievements").insert(
      toGrant.map((a) => ({ user_id: userId, achievement_id: a.id })),
    );

    for (const ach of toGrant) {
      if (ach.chip_reward > 0) {
        await adminClient.from("chip_transactions").insert({
          type:         "achievement" as const,
          amount:       ach.chip_reward,
          to_user_id:   userId,
          from_user_id: null,
          memo:         `🏆 アチーブメント達成: ${ach.name}`,
        });
      }
    }
  } catch (err) {
    console.error("[autoAchievements] error:", err);
  }
}

/** ユーザーの達成pt と 全体pt を取得 */
export async function fetchAchievementProgress(userId: string) {
  const adminClient = createAdminClient();

  const [{ data: allAch }, { data: earnedRows }] = await Promise.all([
    adminClient.from("achievements").select("id, points").eq("is_active", true),
    adminClient.from("user_achievements").select("achievement_id").eq("user_id", userId),
  ]);

  const earnedIds = new Set((earnedRows ?? []).map((e) => e.achievement_id));
  const totalPts  = (allAch ?? []).reduce((s, a) => s + a.points, 0);
  const earnedPts = (allAch ?? [])
    .filter((a) => earnedIds.has(a.id))
    .reduce((s, a) => s + a.points, 0);

  return { earnedPts, totalPts };
}
