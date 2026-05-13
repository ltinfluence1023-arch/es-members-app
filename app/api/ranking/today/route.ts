import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getBusinessDayStartUTC } from "@/lib/utils/businessDay";
import { netChangeByUser } from "@/lib/utils/chipDelta";

export const dynamic = "force-dynamic";

// Today's chip net change ranking — sums ALL chip_transactions for the business day
// (06:00 JST → 翌05:59 JST) using the canonical chipDelta logic.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminClient = createAdminClient();
  const start = getBusinessDayStartUTC();
  const end = new Date(start.getTime() + 86_400_000);

  const { data: txs } = await adminClient
    .from("chip_transactions")
    .select("type, amount, from_user_id, to_user_id")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());

  const totals = netChangeByUser(txs ?? []);
  const sorted = Object.entries(totals).filter(([, v]) => v !== 0).sort((a, b) => b[1] - a[1]);
  const userIds = sorted.map(([id]) => id);

  const { data: users } = userIds.length
    ? await adminClient.from("users").select("id, nickname, avatar_url, ranks(name)").in("id", userIds)
    : { data: [] };
  type U = { id: string; nickname: string; avatar_url: string | null; ranks: { name: string } | null };
  const map: Record<string, U> = {};
  for (const u of (users as U[] | null) ?? []) map[u.id] = u;

  const ranking = sorted.map(([id, value], i) => ({
    rank: i + 1,
    userId: id,
    nickname: map[id]?.nickname ?? "ゲスト",
    avatarUrl: map[id]?.avatar_url ?? null,
    rankName: map[id]?.ranks?.name ?? null,
    value,
  }));

  const myEntry = ranking.find((r) => r.userId === user.id) ?? null;
  return NextResponse.json({
    ranking: ranking.slice(0, 10),
    myRank: myEntry,
    businessDayStart: start.toISOString(),
  });
}
