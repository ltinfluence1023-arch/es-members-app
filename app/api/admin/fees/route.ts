import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin, isMaster } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = createAdminClient();
  const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "100", 10);

  // Total fee pool balance (sum of all fee_transactions)
  const { data: allFees } = await adminClient.from("fee_transactions").select("amount, source");
  const total = (allFees ?? []).reduce((s, r) => s + r.amount, 0);
  const transferFees = (allFees ?? []).filter((r) => r.source === "transfer_fee").reduce((s, r) => s + r.amount, 0);
  const rakeAdded = (allFees ?? []).filter((r) => r.source === "rake").reduce((s, r) => s + r.amount, 0);
  const manualAdded = (allFees ?? []).filter((r) => r.source === "manual_add").reduce((s, r) => s + r.amount, 0);
  const manualSubtracted = (allFees ?? []).filter((r) => r.source === "manual_subtract").reduce((s, r) => s + Math.abs(r.amount), 0);

  // Recent history with operator names
  const { data: tx } = await adminClient
    .from("fee_transactions")
    .select("id, amount, source, memo, related_user_id, created_by, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  // Resolve user nicknames + admin names
  const userIds = new Set<string>();
  const adminIds = new Set<string>();
  for (const t of tx ?? []) {
    if (t.related_user_id) userIds.add(t.related_user_id);
    if (t.created_by) adminIds.add(t.created_by);
  }

  const [usersRes, adminsRes] = await Promise.all([
    userIds.size
      ? adminClient.from("users").select("id, nickname").in("id", [...userIds])
      : Promise.resolve({ data: [] as { id: string; nickname: string }[] }),
    adminIds.size
      ? adminClient.from("admin_users").select("id, name").in("id", [...adminIds])
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const userMap = new Map((usersRes.data ?? []).map((u) => [u.id, u.nickname]));
  const adminMap = new Map((adminsRes.data ?? []).map((a) => [a.id, a.name]));

  const enriched = (tx ?? []).map((t) => ({
    ...t,
    relatedUserName: t.related_user_id ? (userMap.get(t.related_user_id) ?? "—") : null,
    operatorName: t.created_by ? (adminMap.get(t.created_by) ?? "—") : null,
  }));

  return NextResponse.json({
    total,
    breakdown: {
      transferFees,
      rakeAdded,
      manualAdded,
      manualSubtracted,
    },
    transactions: enriched,
  });
}

const adjustSchema = z.object({
  mode: z.enum(["add", "sub", "rake"]),
  amount: z.number().int().positive(),
  memo: z.string().min(1, "メモは必須"),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = adjustSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "入力が不正です" }, { status: 400 });
  }

  const { mode, amount, memo } = parsed.data;

  // Restrict subtract & rake to master accounts
  if ((mode === "sub" || mode === "rake") && !(await isMaster(user.id))) {
    return NextResponse.json({
      error: mode === "sub" ? "減算操作はマスター権限のみ可能です" : "レーキ追加はマスター権限のみ可能です",
    }, { status: 403 });
  }

  const adminClient = createAdminClient();

  let source: "rake" | "manual_add" | "manual_subtract";
  let signedAmount: number;
  if (mode === "rake") {
    source = "rake"; signedAmount = amount;
  } else if (mode === "add") {
    source = "manual_add"; signedAmount = amount;
  } else {
    source = "manual_subtract"; signedAmount = -amount;
  }

  const { error } = await adminClient.from("fee_transactions").insert({
    amount: signedAmount, source, memo, created_by: user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: `fee_${source}`,
    category: "fee",
    summary: `手数料 ${source === "rake" ? "レーキ" : source === "manual_add" ? "追加" : "減算"} ${signedAmount > 0 ? "+" : ""}${signedAmount.toLocaleString()} chip — ${memo}`,
    details: { source, amount: signedAmount, memo },
    actor_id: user.id, request,
  });

  return NextResponse.json({ success: true });
}
