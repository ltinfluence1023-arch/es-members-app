import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getBusinessDayStartUTC } from "@/lib/utils/businessDay";

export const dynamic = "force-dynamic";

// Who's currently "at the store" — anyone who checked in during today's business day.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminClient = createAdminClient();
  const start = getBusinessDayStartUTC();
  const end = new Date(start.getTime() + 86_400_000);

  const { data: visits } = await adminClient
    .from("visits")
    .select("user_id, checked_in_at")
    .gte("checked_in_at", start.toISOString())
    .lt("checked_in_at", end.toISOString())
    .order("checked_in_at", { ascending: false });

  if (!visits || visits.length === 0) {
    return NextResponse.json({ users: [], count: 0, since: start.toISOString() });
  }

  // Dedup by user, keep most-recent checkin time
  const seen = new Map<string, string>();
  for (const v of visits) {
    if (!seen.has(v.user_id)) seen.set(v.user_id, v.checked_in_at);
  }
  const ids = [...seen.keys()];

  const { data: users } = await adminClient
    .from("users")
    .select("id, nickname, avatar_url, total_visit_count, ranks(name)")
    .in("id", ids);

  type U = { id: string; nickname: string; avatar_url: string | null; total_visit_count: number; ranks: { name: string } | null };
  const map: Record<string, U> = {};
  for (const u of ((users as U[] | null) ?? [])) map[u.id] = u;

  const list = ids
    .map((id) => ({
      id,
      nickname: map[id]?.nickname ?? "ゲスト",
      avatarUrl: map[id]?.avatar_url ?? null,
      rankName: map[id]?.ranks?.name ?? null,
      totalVisitCount: map[id]?.total_visit_count ?? 0,
      checkedInAt: seen.get(id)!,
    }))
    .sort((a, b) => +new Date(b.checkedInAt) - +new Date(a.checkedInAt));

  return NextResponse.json({
    users: list,
    count: list.length,
    since: start.toISOString(),
    myId: user.id,
  });
}
