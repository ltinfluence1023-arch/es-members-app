import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isMaster } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";

const schema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().refine((n) => n !== 0),
  memo: z.string().optional(),
});

const DEFAULT_POINT_MEMO = "管理者操作";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isMaster(user.id))) {
    return NextResponse.json({ error: "ポイント操作はマスター権限のみ可能です" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "入力が不正です" }, { status: 400 });

  const { userId, amount, memo } = parsed.data;
  const adminClient = createAdminClient();

  const { error } = await adminClient.from("point_transactions").insert({
    user_id: userId,
    amount,
    type: "admin",
    memo: memo || DEFAULT_POINT_MEMO,
    created_by: user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Resolve user nickname for audit log
  const { data: u } = await adminClient.from("users").select("nickname").eq("id", userId).single();

  await recordAudit({
    action: amount > 0 ? "point_grant" : "point_reduce",
    category: "point",
    summary: `ポイント ${amount > 0 ? "+" : ""}${amount.toLocaleString()}pt → ${u?.nickname ?? "—"}（${memo || DEFAULT_POINT_MEMO}）`,
    target_type: "user", target_id: userId, target_label: u?.nickname ?? null,
    details: { amount, memo },
    actor_id: user.id, request,
  });

  return NextResponse.json({ success: true });
}
