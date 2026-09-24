import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";

const schema = z.object({
  tableId: z.string().uuid(),
  amount: z.number().int().min(1),
});

// レーキは管理チップ残高（fee_transactions source='rake'）に記録する
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
  const { tableId, amount } = parsed.data;

  const adminClient = createAdminClient();
  const { data: table } = await adminClient.from("poker_tables").select("name").eq("id", tableId).single();
  if (!table) return NextResponse.json({ error: "テーブルが見つかりません" }, { status: 404 });

  const { error } = await adminClient.from("fee_transactions").insert({
    amount,
    source: "rake",
    memo: `${table.name} レーキ`,
    created_by: user.id,
  });
  if (error) return NextResponse.json({ error: "レーキの記録に失敗しました" }, { status: 500 });

  await recordAudit({
    action: "poker_rake",
    category: "poker",
    summary: `${table.name} レーキ ${amount.toLocaleString()}`,
    target_type: "poker_table",
    target_id: tableId,
    target_label: table.name,
    details: { amount },
    actor_id: user.id,
    request,
  });

  return NextResponse.json({ success: true });
}
