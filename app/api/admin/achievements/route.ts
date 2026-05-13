import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = createAdminClient();
  const { data: achievements } = await adminClient
    .from("achievements")
    .select("id, code, name, description, category, difficulty, points, chip_reward, track_type, is_active, sort_order")
    .order("sort_order");

  // 各ミッションの達成者数も取得
  const { data: counts } = await adminClient
    .from("user_achievements")
    .select("achievement_id");

  const countMap = new Map<string, number>();
  (counts ?? []).forEach((c) => {
    countMap.set(c.achievement_id, (countMap.get(c.achievement_id) ?? 0) + 1);
  });

  const result = (achievements ?? []).map((a) => ({
    ...a,
    earnedCount: countMap.get(a.id) ?? 0,
  }));

  return NextResponse.json(result);
}
