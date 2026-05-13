import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { netChangeByUser } from "@/lib/utils/chipDelta";
import { getBusinessDayStartUTC } from "@/lib/utils/businessDay";

type RankTab =
  | "daily_chip"          // 本日のチップ増減
  | "monthly_chip"        // 月間チップ増減
  | "yearly_chip"         // 年間チップ増減
  | "weekly_visit"        // 週間来店回数
  | "monthly_visit"       // 月間来店回数
  | "yearly_visit"        // 年間来店回数
  | "total_visit"         // 累計来店回数
  | "monthly_received"    // 月間チップ獲得（受取り合計）
  | "monthly_sent"        // 月間チップ送付（送り側合計）
  | "total_chip"          // 保有チップ合計
  | "bj_monthly"          // BJ月間純損益
  | "bj_total";           // BJ累計純損益

interface RankEntry { rank: number; userId: string; nickname: string; value: number; unit?: string }
interface Period { label: string; from: string; to: string }

async function getUserMap(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const { data } = await createAdminClient().from("users").select("id, nickname").in("id", ids);
  const map: Record<string, string> = {};
  for (const u of data ?? []) map[u.id] = u.nickname;
  return map;
}

function fmtDate(d: Date) {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

async function getRanking(tab: RankTab): Promise<{ ranking: RankEntry[]; period: Period }> {
  const adminClient = createAdminClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31);

  // ----------- CHIP NET CHANGE -----------
  async function computeNet(from: Date) {
    const { data } = await adminClient
      .from("chip_transactions")
      .select("type, amount, from_user_id, to_user_id")
      .gte("created_at", from.toISOString());
    return netChangeByUser(data ?? []);
  }
  function packNet(totals: Record<string, number>): [string, number][] {
    return Object.entries(totals).filter(([, v]) => v !== 0).sort((a, b) => b[1] - a[1]);
  }

  if (tab === "daily_chip") {
    const from = getBusinessDayStartUTC();
    const totals = await computeNet(from);
    const sorted = packNet(totals);
    const nickMap = await getUserMap(sorted.map(([id]) => id));
    return {
      ranking: sorted.map(([id, value], i) => ({ rank: i + 1, userId: id, nickname: nickMap[id] ?? "ゲスト", value, unit: "chip" })),
      period: { label: "本日", from: fmtDate(from), to: fmtDate(now) },
    };
  }

  if (tab === "monthly_chip") {
    const totals = await computeNet(monthStart);
    const sorted = packNet(totals);
    const nickMap = await getUserMap(sorted.map(([id]) => id));
    return {
      ranking: sorted.map(([id, value], i) => ({ rank: i + 1, userId: id, nickname: nickMap[id] ?? "ゲスト", value, unit: "chip" })),
      period: { label: `${now.getFullYear()}年${now.getMonth() + 1}月`, from: fmtDate(monthStart), to: fmtDate(monthEnd) },
    };
  }

  if (tab === "yearly_chip") {
    const totals = await computeNet(yearStart);
    const sorted = packNet(totals);
    const nickMap = await getUserMap(sorted.map(([id]) => id));
    return {
      ranking: sorted.map(([id, value], i) => ({ rank: i + 1, userId: id, nickname: nickMap[id] ?? "ゲスト", value, unit: "chip" })),
      period: { label: `${now.getFullYear()}年`, from: fmtDate(yearStart), to: fmtDate(yearEnd) },
    };
  }

  // ----------- VISIT COUNTS -----------
  async function countVisits(from: Date | null) {
    let q = adminClient.from("visits").select("user_id");
    if (from) q = q.gte("checked_in_at", from.toISOString());
    const { data } = await q;
    const totals: Record<string, number> = {};
    for (const r of data ?? []) totals[r.user_id] = (totals[r.user_id] ?? 0) + 1;
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }

  if (tab === "weekly_visit") {
    const sunday = new Date(now);
    sunday.setDate(sunday.getDate() - sunday.getDay()); sunday.setHours(0, 0, 0, 0);
    const sorted = await countVisits(sunday);
    const nickMap = await getUserMap(sorted.map(([id]) => id));
    return {
      ranking: sorted.map(([id, value], i) => ({ rank: i + 1, userId: id, nickname: nickMap[id] ?? "ゲスト", value, unit: "回" })),
      period: { label: "今週", from: fmtDate(sunday), to: fmtDate(now) },
    };
  }

  if (tab === "monthly_visit") {
    const sorted = await countVisits(monthStart);
    const nickMap = await getUserMap(sorted.map(([id]) => id));
    return {
      ranking: sorted.map(([id, value], i) => ({ rank: i + 1, userId: id, nickname: nickMap[id] ?? "ゲスト", value, unit: "回" })),
      period: { label: `${now.getFullYear()}年${now.getMonth() + 1}月`, from: fmtDate(monthStart), to: fmtDate(monthEnd) },
    };
  }

  if (tab === "yearly_visit") {
    const sorted = await countVisits(yearStart);
    const nickMap = await getUserMap(sorted.map(([id]) => id));
    return {
      ranking: sorted.map(([id, value], i) => ({ rank: i + 1, userId: id, nickname: nickMap[id] ?? "ゲスト", value, unit: "回" })),
      period: { label: `${now.getFullYear()}年`, from: fmtDate(yearStart), to: fmtDate(yearEnd) },
    };
  }

  if (tab === "total_visit") {
    const { data } = await adminClient
      .from("users")
      .select("id, nickname, total_visit_count")
      .order("total_visit_count", { ascending: false });
    return {
      ranking: (data ?? []).map((u, i) => ({
        rank: i + 1, userId: u.id, nickname: u.nickname, value: u.total_visit_count, unit: "回",
      })),
      period: { label: "累計", from: "—", to: "—" },
    };
  }

  // ----------- CHIP RECEIVED / SENT -----------
  if (tab === "monthly_received") {
    const { data } = await adminClient
      .from("chip_transactions")
      .select("amount, to_user_id")
      .not("to_user_id", "is", null)
      .gte("created_at", monthStart.toISOString());
    const totals: Record<string, number> = {};
    for (const r of data ?? []) totals[r.to_user_id!] = (totals[r.to_user_id!] ?? 0) + r.amount;
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const nickMap = await getUserMap(sorted.map(([id]) => id));
    return {
      ranking: sorted.map(([id, value], i) => ({ rank: i + 1, userId: id, nickname: nickMap[id] ?? "ゲスト", value, unit: "chip" })),
      period: { label: `${now.getFullYear()}年${now.getMonth() + 1}月`, from: fmtDate(monthStart), to: fmtDate(monthEnd) },
    };
  }

  if (tab === "monthly_sent") {
    const { data } = await adminClient
      .from("chip_transactions")
      .select("amount, from_user_id")
      .eq("type", "transfer")
      .not("from_user_id", "is", null)
      .gte("created_at", monthStart.toISOString());
    const totals: Record<string, number> = {};
    for (const r of data ?? []) totals[r.from_user_id!] = (totals[r.from_user_id!] ?? 0) + r.amount;
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const nickMap = await getUserMap(sorted.map(([id]) => id));
    return {
      ranking: sorted.map(([id, value], i) => ({ rank: i + 1, userId: id, nickname: nickMap[id] ?? "ゲスト", value, unit: "chip" })),
      period: { label: `${now.getFullYear()}年${now.getMonth() + 1}月`, from: fmtDate(monthStart), to: fmtDate(monthEnd) },
    };
  }

  // bj_monthly — BJ月間純損益
  if (tab === "bj_monthly") {
    const { data } = await adminClient
      .from("blackjack_sessions")
      .select("user_id, net_chips")
      .eq("settled", true)
      .gte("created_at", monthStart.toISOString());
    const totals: Record<string, number> = {};
    for (const r of data ?? []) totals[r.user_id] = (totals[r.user_id] ?? 0) + r.net_chips;
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const nickMap = await getUserMap(sorted.map(([id]) => id));
    return {
      ranking: sorted.map(([id, value], i) => ({ rank: i + 1, userId: id, nickname: nickMap[id] ?? "ゲスト", value, unit: "chip" })),
      period: { label: `${now.getFullYear()}年${now.getMonth() + 1}月 BJ`, from: fmtDate(monthStart), to: fmtDate(monthEnd) },
    };
  }

  // bj_total — BJ累計純損益
  if (tab === "bj_total") {
    const { data } = await adminClient
      .from("blackjack_sessions")
      .select("user_id, net_chips")
      .eq("settled", true);
    const totals: Record<string, number> = {};
    for (const r of data ?? []) totals[r.user_id] = (totals[r.user_id] ?? 0) + r.net_chips;
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const nickMap = await getUserMap(sorted.map(([id]) => id));
    return {
      ranking: sorted.map(([id, value], i) => ({ rank: i + 1, userId: id, nickname: nickMap[id] ?? "ゲスト", value, unit: "chip" })),
      period: { label: "BJ累計", from: "—", to: "—" },
    };
  }

  // total_chip — current chip balance
  const { data } = await adminClient
    .from("users")
    .select("id, nickname, chip_balance")
    .order("chip_balance", { ascending: false });
  return {
    ranking: (data ?? []).map((u, i) => ({
      rank: i + 1, userId: u.id, nickname: u.nickname, value: u.chip_balance, unit: "chip",
    })),
    period: { label: "現在保有", from: "—", to: "—" },
  };
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tab = (request.nextUrl.searchParams.get("tab") ?? "monthly_chip") as RankTab;
  const { ranking, period } = await getRanking(tab);

  const top20 = ranking.slice(0, 20);
  const myEntry = ranking.find((r) => r.userId === user.id) ?? null;
  const myRank = myEntry && myEntry.rank > 20 ? myEntry : null;

  return NextResponse.json({
    ranking: top20, myRank, myId: user.id, period,
    updatedAt: new Date().toISOString(),
  });
}
