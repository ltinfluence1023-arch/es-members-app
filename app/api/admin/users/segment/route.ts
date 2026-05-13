import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  search: z.string().optional(), // nickname / id partial match
  visitMin: z.number().int().nonnegative().optional(),
  visitMax: z.number().int().nonnegative().optional(),
  chipMin: z.number().int().nonnegative().optional(),
  chipMax: z.number().int().nonnegative().optional(),
  pointMin: z.number().int().nonnegative().optional(),
  pointMax: z.number().int().nonnegative().optional(),
  rankIds: z.array(z.string().uuid()).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  registeredAfter: z.string().optional(), // ISO
  registeredBefore: z.string().optional(),
  lastVisitAfter: z.string().optional(),
  lastVisitBefore: z.string().optional(),
});

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await createAdminClient()
    .from("admin_users").select("id").eq("id", userId).single();
  return !!data;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
  }

  const f = parsed.data;
  const adminClient = createAdminClient();

  let query = adminClient
    .from("users")
    .select("id, nickname, chip_balance, point_balance, total_visit_count, rank_id, gender, last_visit_at, created_at, ranks(name)");

  if (typeof f.visitMin === "number") query = query.gte("total_visit_count", f.visitMin);
  if (typeof f.visitMax === "number") query = query.lte("total_visit_count", f.visitMax);
  if (typeof f.chipMin === "number") query = query.gte("chip_balance", f.chipMin);
  if (typeof f.chipMax === "number") query = query.lte("chip_balance", f.chipMax);
  if (typeof f.pointMin === "number") query = query.gte("point_balance", f.pointMin);
  if (typeof f.pointMax === "number") query = query.lte("point_balance", f.pointMax);
  if (f.rankIds && f.rankIds.length > 0) query = query.in("rank_id", f.rankIds);
  if (f.gender) query = query.eq("gender", f.gender);
  if (f.registeredAfter) query = query.gte("created_at", f.registeredAfter);
  if (f.registeredBefore) query = query.lte("created_at", f.registeredBefore);
  if (f.lastVisitAfter) query = query.gte("last_visit_at", f.lastVisitAfter);
  if (f.lastVisitBefore) query = query.lte("last_visit_at", f.lastVisitBefore);

  const { data, error } = await query.order("nickname");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter by search term (nickname or id substring) client-side after DB query
  const term = f.search?.trim().toLowerCase();
  const filtered = term
    ? (data ?? []).filter((u) =>
        u.nickname.toLowerCase().includes(term) || u.id.toLowerCase().includes(term))
    : (data ?? []);

  return NextResponse.json({
    users: filtered.map((u) => ({
      id: u.id,
      nickname: u.nickname,
      chip_balance: u.chip_balance,
      point_balance: u.point_balance,
      total_visit_count: u.total_visit_count,
      rank_name: (u.ranks as { name: string } | null)?.name ?? null,
      gender: u.gender,
      last_visit_at: u.last_visit_at,
      created_at: u.created_at,
    })),
    count: filtered.length,
  });
}
