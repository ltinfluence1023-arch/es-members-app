import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getBusinessDayStartUTC, getBusinessDayOffsetUTC } from "@/lib/utils/businessDay";

async function isAdmin(userId: string) {
  const { data } = await createAdminClient().from("admin_users").select("id").eq("id", userId).single();
  return !!data;
}

// Returns business-day start (UTC) for a given JST date string YYYY-MM-DD
function bdStartFromJSTDate(yyyymmdd: string): Date {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  // noon JST → guarantees the business-day floor maps to that calendar day
  const noon = new Date(Date.UTC(y, m - 1, d, 3, 0, 0));
  return getBusinessDayStartUTC(noon);
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = createAdminClient();

  const period = request.nextUrl.searchParams.get("period") ?? "day";
  const dateParam = request.nextUrl.searchParams.get("date"); // YYYY-MM-DD (for day)
  const monthParam = request.nextUrl.searchParams.get("month"); // YYYY-MM (for month)

  // Compute period range (UTC), period label, and number of sub-buckets for daily chart
  let rangeStart: Date;
  let rangeEnd: Date;
  let label: string;
  let dayCount: number;

  if (period === "month") {
    const [y, m] = (monthParam ?? new Date().toISOString().slice(0, 7)).split("-").map(Number);
    // First business day of that JST month, last business day of that month
    const firstDayJST = `${y}-${String(m).padStart(2, "0")}-01`;
    rangeStart = bdStartFromJSTDate(firstDayJST);
    // last day of month in JST
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const lastDayJST = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const lastStart = bdStartFromJSTDate(lastDayJST);
    rangeEnd = new Date(lastStart.getTime() + 86_400_000);
    dayCount = lastDay;
    label = `${y}年${m}月`;
  } else {
    // single business day (default = today)
    if (dateParam) {
      rangeStart = bdStartFromJSTDate(dateParam);
    } else {
      rangeStart = getBusinessDayStartUTC();
    }
    rangeEnd = new Date(rangeStart.getTime() + 86_400_000);
    dayCount = 1;
    const jst = new Date(rangeStart.getTime() + 6 * 3600 * 1000 + 9 * 3600 * 1000);
    label = `${jst.getUTCFullYear()}/${String(jst.getUTCMonth() + 1).padStart(2, "0")}/${String(jst.getUTCDate()).padStart(2, "0")}`;
  }

  // Aggregate chip flow for the period
  const { data: chipFlow } = await adminClient
    .from("chip_transactions")
    .select("type, amount, to_user_id, from_user_id, created_at")
    .gte("created_at", rangeStart.toISOString())
    .lt("created_at", rangeEnd.toISOString());

  let transferAmt = 0, adminGrant = 0, adminReduction = 0, checkinAmt = 0;
  for (const t of chipFlow ?? []) {
    if (t.type === "transfer" && t.to_user_id) transferAmt += t.amount;
    else if (t.type === "checkin") checkinAmt += t.amount;
    else if (t.type === "admin") {
      if (t.to_user_id) adminGrant += t.amount;
      else if (t.from_user_id) adminReduction += t.amount;
    }
  }
  // GDP = ユーザー間トランスファーのチップ移動量のみ
  const gdp = transferAmt;

  // Visits in period (count, unique users)
  const { count: checkinCount } = await adminClient
    .from("visits")
    .select("id", { count: "exact", head: true })
    .gte("checked_in_at", rangeStart.toISOString())
    .lt("checked_in_at", rangeEnd.toISOString());

  // Daily chart data (each business day in range)
  const dailyChart: { date: string; checkins: number; gdp: number; transfer: number; adminGrant: number; checkin: number }[] = [];
  for (let i = 0; i < dayCount; i++) {
    const dStart = new Date(rangeStart.getTime() + i * 86_400_000);
    const dEnd = new Date(dStart.getTime() + 86_400_000);

    const [{ count: cks }, { data: tx }] = await Promise.all([
      adminClient
        .from("visits")
        .select("id", { count: "exact", head: true })
        .gte("checked_in_at", dStart.toISOString())
        .lt("checked_in_at", dEnd.toISOString()),
      adminClient
        .from("chip_transactions")
        .select("type, amount, to_user_id, from_user_id")
        .gte("created_at", dStart.toISOString())
        .lt("created_at", dEnd.toISOString()),
    ]);

    let dT = 0, dA = 0, dC = 0;
    for (const t of tx ?? []) {
      if (t.type === "transfer" && t.to_user_id) dT += t.amount;
      else if (t.type === "checkin") dC += t.amount;
      else if (t.type === "admin" && t.to_user_id) dA += t.amount;
    }

    const mid = new Date(dStart.getTime() + 6 * 3600 * 1000 + 9 * 3600 * 1000);
    const m = String(mid.getUTCMonth() + 1).padStart(2, "0");
    const d = String(mid.getUTCDate()).padStart(2, "0");

    dailyChart.push({
      date: `${m}/${d}`,
      checkins: cks ?? 0,
      // GDP = transferのみ
      gdp: dT,
      transfer: dT,
      adminGrant: dA,
      checkin: dC,
    });
  }

  // Global stats (period-independent)
  const [
    { count: totalUsers },
    { count: newUsersInPeriod },
    { data: topChip },
    { data: topPoint },
  ] = await Promise.all([
    adminClient.from("users").select("id", { count: "exact", head: true }),
    adminClient
      .from("users")
      .select("id", { count: "exact", head: true })
      .gte("created_at", rangeStart.toISOString())
      .lt("created_at", rangeEnd.toISOString()),
    adminClient
      .from("users")
      .select("id, nickname, chip_balance, ranks(name)")
      .order("chip_balance", { ascending: false })
      .limit(10),
    adminClient
      .from("users")
      .select("id, nickname, point_balance, ranks(name)")
      .order("point_balance", { ascending: false })
      .limit(10),
  ]);

  return NextResponse.json({
    period,
    label,
    range: { start: rangeStart.toISOString(), end: rangeEnd.toISOString() },
    totalUsers: totalUsers ?? 0,
    newUsersInPeriod: newUsersInPeriod ?? 0,
    checkinCount: checkinCount ?? 0,
    flow: {
      transfer: transferAmt,
      adminGrant,
      adminReduction,
      checkin: checkinAmt,
      gdp,
    },
    dailyChart,
    topChip: (topChip ?? []).map((u) => ({
      id: u.id,
      nickname: u.nickname,
      value: u.chip_balance,
      rankName: (u.ranks as { name: string } | null)?.name ?? null,
    })),
    topPoint: (topPoint ?? []).map((u) => ({
      id: u.id,
      nickname: u.nickname,
      value: u.point_balance,
      rankName: (u.ranks as { name: string } | null)?.name ?? null,
    })),
  });
}
