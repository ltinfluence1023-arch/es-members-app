import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminClient = createAdminClient();

  const [{ data: all }, { data: earned }, { data: claims }] = await Promise.all([
    adminClient
      .from("achievements")
      .select("id, code, name, description, category, difficulty, points, chip_reward, track_type, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
    adminClient
      .from("user_achievements")
      .select("achievement_id, achieved_at")
      .eq("user_id", user.id),
    adminClient
      .from("achievement_claims")
      .select("achievement_id, status")
      .eq("user_id", user.id),
  ]);

  const earnedMap = new Map((earned ?? []).map((e) => [e.achievement_id, e.achieved_at]));
  const claimMap  = new Map((claims ?? []).map((c) => [c.achievement_id, c.status]));

  const achievements = (all ?? []).map((a) => ({
    ...a,
    earned:     earnedMap.has(a.id),
    earnedAt:   earnedMap.get(a.id) ?? null,
    claimStatus: claimMap.get(a.id) ?? null,
  }));

  const totalPts  = achievements.reduce((s, a) => s + a.points, 0);
  const earnedPts = achievements.filter((a) => a.earned).reduce((s, a) => s + a.points, 0);

  return NextResponse.json({ achievements, earnedPts, totalPts });
}
