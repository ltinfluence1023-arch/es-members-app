import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { getBusinessDayStartUTC } from "@/lib/utils/businessDay";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const dateParam = request.nextUrl.searchParams.get("date");
  let start: Date;
  if (dateParam) {
    const [y, m, d] = dateParam.split("-").map(Number);
    const noonJST = new Date(Date.UTC(y, m - 1, d, 3, 0, 0));
    start = getBusinessDayStartUTC(noonJST);
  } else {
    start = getBusinessDayStartUTC();
  }
  const end = new Date(start.getTime() + 86_400_000);

  const adminClient = createAdminClient();

  const [{ data: chipTx }, { data: pointTx }] = await Promise.all([
    adminClient
      .from("chip_transactions")
      .select("id, amount, type, memo, from_user_id, to_user_id, created_by, created_at")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .order("created_at", { ascending: false }),
    adminClient
      .from("point_transactions")
      .select("id, user_id, amount, type, memo, created_by, created_at")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .order("created_at", { ascending: false }),
  ]);

  // Resolve user/admin names
  const customerIds = new Set<string>();
  const adminIds = new Set<string>();
  for (const t of chipTx ?? []) {
    if (t.from_user_id) customerIds.add(t.from_user_id);
    if (t.to_user_id) customerIds.add(t.to_user_id);
    if (t.created_by) adminIds.add(t.created_by);
  }
  for (const t of pointTx ?? []) {
    customerIds.add(t.user_id);
    if (t.created_by) adminIds.add(t.created_by);
  }

  const [customersRes, adminsRes] = await Promise.all([
    customerIds.size
      ? adminClient.from("users").select("id, nickname").in("id", [...customerIds])
      : Promise.resolve({ data: [] as { id: string; nickname: string }[] }),
    adminIds.size
      ? adminClient.from("admin_users").select("id, name").in("id", [...adminIds])
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const customerNames: Record<string, string> = {};
  for (const c of customersRes.data ?? []) customerNames[c.id] = c.nickname;
  const adminNames: Record<string, string> = {};
  for (const a of adminsRes.data ?? []) adminNames[a.id] = a.name;

  // Stats
  let chipNet = 0;
  for (const t of chipTx ?? []) {
    if (t.type === "seat_out") {
      chipNet += t.amount;
    } else if (t.type === "withdraw" || t.type === "fee") {
      chipNet -= t.amount;
    } else {
      chipNet += (t.to_user_id ? t.amount : 0) - (t.from_user_id && !t.to_user_id ? t.amount : 0);
    }
  }
  const pointNet = (pointTx ?? []).reduce((s, t) => s + t.amount, 0);

  // JST date label
  const jst = new Date(start.getTime() + 6 * 3600 * 1000 + 9 * 3600 * 1000);
  const label = `${jst.getUTCFullYear()}/${String(jst.getUTCMonth() + 1).padStart(2, "0")}/${String(jst.getUTCDate()).padStart(2, "0")}`;

  return NextResponse.json({
    date: dateParam ?? "",
    label,
    rangeStart: start.toISOString(),
    rangeEnd: end.toISOString(),
    chipTx: chipTx ?? [],
    pointTx: pointTx ?? [],
    customerNames,
    adminNames,
    stats: {
      chipCount: (chipTx ?? []).length,
      pointCount: (pointTx ?? []).length,
      chipNet,
      pointNet,
    },
  });
}
