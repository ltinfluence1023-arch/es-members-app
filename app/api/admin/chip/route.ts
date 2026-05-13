import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";

const schema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().refine((n) => n !== 0),
  memo: z.string().optional(),
});

const DEFAULT_CHIP_MEMO = "管理者操作";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "入力が不正です" }, { status: 400 });

  const { userId, amount, memo } = parsed.data;
  const adminClient = createAdminClient();

  const { error } = await adminClient.from("chip_transactions").insert({
    to_user_id: amount > 0 ? userId : null,
    from_user_id: amount < 0 ? userId : null,
    amount: Math.abs(amount),
    type: "admin",
    memo: memo || DEFAULT_CHIP_MEMO,
    created_by: user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: u } = await adminClient.from("users").select("nickname").eq("id", userId).single();

  await recordAudit({
    action: amount > 0 ? "chip_grant" : "chip_reduce",
    category: "chip",
    summary: `チップ ${amount > 0 ? "+" : ""}${amount.toLocaleString()} chip → ${u?.nickname ?? "—"}（${memo || DEFAULT_CHIP_MEMO}）`,
    target_type: "user", target_id: userId, target_label: u?.nickname ?? null,
    details: { amount, memo },
    actor_id: user.id, request,
  });

  return NextResponse.json({ success: true });
}
