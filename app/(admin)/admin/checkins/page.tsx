import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getBusinessDayStartUTC, getBusinessDayEndUTC } from "@/lib/utils/businessDay";
import { CheckinsClient } from "@/components/admin/CheckinsClient";

async function isAdmin(userId: string) {
  const { data } = await createAdminClient()
    .from("admin_users")
    .select("id")
    .eq("id", userId)
    .single();
  return !!data;
}

export default async function CheckinsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isAdmin(user.id))) redirect("/login");

  const adminClient = createAdminClient();
  const startUTC = getBusinessDayStartUTC();
  const endUTC = getBusinessDayEndUTC(startUTC);

  // Chip flow breakdown
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
  const flow = {
    transfer: transferAmt,
    adminGrant,
    adminReduction,
    checkin: checkinAmt,
    // GDP = ユーザー間トランスファーのチップ移動量のみ
    gdp: transferAmt,
  };

  const { data: visits } = await adminClient
    .from("visits")
    .select("id, user_id, checked_in_at, bonus_chip")
    .gte("checked_in_at", startUTC.toISOString())
    .lt("checked_in_at", endUTC.toISOString())
    .order("checked_in_at", { ascending: false });

  let enriched: {
    id: string;
    user_id: string;
    nickname: string;
    rankName: string | null;
    visitCount: number;
    birthday: string | null;
    checked_in_at: string;
    bonus_chip: number;
  }[] = [];

  if (visits && visits.length > 0) {
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

    enriched = visits.map((v) => ({
      ...v,
      nickname: userMap[v.user_id]?.nickname ?? "ゲスト",
      rankName: userMap[v.user_id]?.rankName ?? null,
      visitCount: userMap[v.user_id]?.visitCount ?? 0,
      birthday: userMap[v.user_id]?.birthday ?? null,
    }));
  }

  const initialData = {
    visits: enriched,
    start: startUTC.toISOString(),
    end: endUTC.toISOString(),
    flow,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">チェックイン</h1>
        <p className="text-sm text-muted-foreground mt-0.5">本日の来店記録・日別履歴</p>
      </div>
      <CheckinsClient initialData={initialData} />
    </div>
  );
}
