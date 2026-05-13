import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { getBusinessDayStartUTC, getBusinessDayEndUTC } from "@/lib/utils/businessDay";

async function isAdmin(userId: string) {
  const { data } = await createAdminClient().from("admin_users").select("id").eq("id", userId).single();
  return !!data;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // date param: "YYYY-MM-DD" in JST calendar (business day label)
  // If omitted → today's business day
  const dateParam = request.nextUrl.searchParams.get("date");
  let startUTC: Date;

  if (dateParam) {
    // Parse YYYY-MM-DD as 06:00 JST = 21:00 UTC previous day
    const [y, m, d] = dateParam.split("-").map(Number);
    const jst6am = Date.UTC(y, m - 1, d, 6 - 9); // = Date.UTC(y,m-1,d,-3) = prev day 21:00 UTC
    startUTC = new Date(jst6am < 0 ? jst6am + 86_400_000 : jst6am);
    // Simpler: just use getBusinessDayStartUTC of a date at noon JST
    const noon = new Date(Date.UTC(y, m - 1, d, 3, 0, 0)); // noon JST = 03:00 UTC
    startUTC = getBusinessDayStartUTC(noon);
  } else {
    startUTC = getBusinessDayStartUTC();
  }

  const endUTC = getBusinessDayEndUTC(startUTC);
  const adminClient = createAdminClient();

  // Chip flow breakdown for the business day (GDP excludes admin reductions)
  const { data: chipFlow } = await adminClient
    .from("chip_transactions")
    .select("type, amount, to_user_id, from_user_id")
    .gte("created_at", startUTC.toISOString())
    .lt("created_at", endUTC.toISOString());

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

  const flowStats = {
    transfer: transferAmt,
    adminGrant,
    adminReduction,
    checkin: checkinAmt,
    gdp,
  };

  const { data: visits } = await adminClient
    .from("visits")
    .select("id, user_id, checked_in_at, bonus_chip")
    .gte("checked_in_at", startUTC.toISOString())
    .lt("checked_in_at", endUTC.toISOString())
    .order("checked_in_at", { ascending: false });

  if (!visits || visits.length === 0) {
    return NextResponse.json({
      visits: [],
      start: startUTC.toISOString(),
      end: endUTC.toISOString(),
      flow: flowStats,
    });
  }

  const userIds = [...new Set(visits.map((v) => v.user_id))];
  const { data: users } = await adminClient
    .from("users")
    .select("id, nickname, total_visit_count, birthday, ranks(name)")
    .in("id", userIds);

  const userMap: Record<string, { nickname: string; rankName: string | null; visitCount: number; birthday: string | null }> = {};
  for (const u of users ?? []) {
    userMap[u.id] = {
      nickname: u.nickname,
      rankName: (u.ranks as { name: string } | null)?.name ?? null,
      visitCount: u.total_visit_count ?? 0,
      birthday: u.birthday ?? null,
    };
  }

  const enriched = visits.map((v) => ({
    ...v,
    nickname: userMap[v.user_id]?.nickname ?? "ゲスト",
    rankName: userMap[v.user_id]?.rankName ?? null,
    visitCount: userMap[v.user_id]?.visitCount ?? 0,
    birthday: userMap[v.user_id]?.birthday ?? null,
  }));

  return NextResponse.json({
    visits: enriched,
    start: startUTC.toISOString(),
    end: endUTC.toISOString(),
    flow: flowStats,
  });
}
