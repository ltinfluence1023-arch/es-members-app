import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { getBusinessDayStartUTC } from "@/lib/utils/businessDay";
import { netChangeByUser } from "@/lib/utils/chipDelta";

export const dynamic = "force-dynamic";

// Period rankings for admins. Supported scopes:
//   ?type=daily_chip     &date=YYYY-MM-DD       (chip net change for one business day, JST)
//   ?type=monthly_chip   &month=YYYY-MM         (chip net change for the month)
//   ?type=yearly_chip    &year=YYYY             (chip net change for the year)
//   ?type=yearly_visit   &year=YYYY             (visit count for the year)
//   ?type=total_chip                            (total chip balance, all-time)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const params = request.nextUrl.searchParams;
  const type = params.get("type") ?? "daily_chip";

  const adminClient = createAdminClient();

  let from: Date;
  let to: Date;
  let label: string;

  if (type === "daily_chip") {
    const dateParam = params.get("date");
    if (dateParam) {
      const [y, m, d] = dateParam.split("-").map(Number);
      const noonJST = new Date(Date.UTC(y, m - 1, d, 3, 0, 0));
      from = getBusinessDayStartUTC(noonJST);
    } else {
      from = getBusinessDayStartUTC();
    }
    to = new Date(from.getTime() + 86_400_000);
    const jst = new Date(from.getTime() + 6 * 3600 * 1000 + 9 * 3600 * 1000);
    label = `${jst.getUTCFullYear()}/${String(jst.getUTCMonth() + 1).padStart(2, "0")}/${String(jst.getUTCDate()).padStart(2, "0")} (06:00〜翌05:59 JST)`;
  } else if (type === "monthly_chip") {
    const monthParam = params.get("month") ?? new Date().toISOString().slice(0, 7);
    const [y, m] = monthParam.split("-").map(Number);
    from = new Date(Date.UTC(y, m - 1, 1, -9, 0, 0));
    to = new Date(Date.UTC(y, m, 1, -9, 0, 0));
    label = `${y}年${m}月`;
  } else if (type === "yearly_chip" || type === "yearly_visit") {
    const yParam = params.get("year") ?? String(new Date().getFullYear());
    const y = Number(yParam);
    from = new Date(Date.UTC(y, 0, 1, -9, 0, 0));
    to = new Date(Date.UTC(y + 1, 0, 1, -9, 0, 0));
    label = `${y}年`;
  } else {
    from = new Date(0);
    to = new Date();
    label = "全期間";
  }

  // Visit ranking
  if (type === "yearly_visit") {
    const { data: visits } = await adminClient
      .from("visits")
      .select("user_id")
      .gte("checked_in_at", from.toISOString())
      .lt("checked_in_at", to.toISOString());

    const counts: Record<string, number> = {};
    for (const v of visits ?? []) counts[v.user_id] = (counts[v.user_id] ?? 0) + 1;
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const userIds = sorted.map(([id]) => id);
    const { data: users } = userIds.length
      ? await adminClient.from("users").select("id, nickname, ranks(name)").in("id", userIds)
      : { data: [] };
    type U = { id: string; nickname: string; ranks: { name: string } | null };
    const map: Record<string, U> = {};
    for (const u of (users as U[] | null) ?? []) map[u.id] = u;

    return NextResponse.json({
      type, label,
      ranking: sorted.map(([id, value], i) => ({
        rank: i + 1, userId: id,
        nickname: map[id]?.nickname ?? "ゲスト",
        rankName: map[id]?.ranks?.name ?? null,
        value, unit: "回",
      })),
    });
  }

  // Total chip — read directly from users.chip_balance
  if (type === "total_chip") {
    const { data: users } = await adminClient
      .from("users").select("id, nickname, chip_balance, ranks(name)")
      .order("chip_balance", { ascending: false });
    type U = { id: string; nickname: string; chip_balance: number; ranks: { name: string } | null };
    return NextResponse.json({
      type, label,
      ranking: ((users as U[] | null) ?? []).map((u, i) => ({
        rank: i + 1, userId: u.id,
        nickname: u.nickname,
        rankName: u.ranks?.name ?? null,
        value: u.chip_balance, unit: "chip",
      })),
    });
  }

  // Chip net change — sums ALL chip_transactions in the period using canonical chipDelta logic
  const { data: tx } = await adminClient
    .from("chip_transactions")
    .select("type, amount, from_user_id, to_user_id")
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString());

  const totals = netChangeByUser(tx ?? []);
  const sorted = Object.entries(totals).filter(([, v]) => v !== 0).sort((a, b) => b[1] - a[1]);
  const userIds = sorted.map(([id]) => id);
  const { data: users } = userIds.length
    ? await adminClient.from("users").select("id, nickname, ranks(name)").in("id", userIds)
    : { data: [] };
  type U2 = { id: string; nickname: string; ranks: { name: string } | null };
  const map: Record<string, U2> = {};
  for (const u of (users as U2[] | null) ?? []) map[u.id] = u;

  // GDP for the period = transfer chip movement only
  const gdp = (tx ?? [])
    .filter((t) => t.type === "transfer" && t.to_user_id)
    .reduce((s, t) => s + t.amount, 0);

  return NextResponse.json({
    type, label,
    range: { from: from.toISOString(), to: to.toISOString() },
    gdp,
    ranking: sorted.map(([id, value], i) => ({
      rank: i + 1, userId: id,
      nickname: map[id]?.nickname ?? "ゲスト",
      rankName: map[id]?.ranks?.name ?? null,
      value, unit: "chip",
    })),
  });
}
