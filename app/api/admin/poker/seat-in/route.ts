import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { pokerErrorMessage, seatLabel } from "@/lib/admin/poker";

const schema = z.object({
  tableId: z.string().uuid(),
  seatNo: z.number().int().min(1),
  userId: z.string().uuid(),
  withdraw: z.number().int().min(0),
  purchase: z.number().int().min(0),
}).refine((v) => v.withdraw + v.purchase > 0, { message: "チップ数を入力してください" });

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
  const { tableId, seatNo, userId, withdraw, purchase } = parsed.data;

  const adminClient = createAdminClient();
  const [{ data: table }, { data: customer }] = await Promise.all([
    adminClient.from("poker_tables").select("name").eq("id", tableId).single(),
    adminClient.from("users").select("nickname").eq("id", userId).single(),
  ]);
  const where = `${table?.name ?? "ポーカー"} ${seatLabel(seatNo)}`;

  const { data: sessionId, error } = await adminClient.rpc("poker_seat_in", {
    p_table_id: tableId,
    p_seat_no: seatNo,
    p_user_id: userId,
    p_withdraw: withdraw,
    p_purchase: purchase,
    p_staff_id: user.id,
    p_memo: `${where} 着席`,
  });
  if (error) return NextResponse.json({ error: pokerErrorMessage(error.message) }, { status: 400 });

  await recordAudit({
    action: "poker_seat_in",
    category: "poker",
    summary: `${where} 着席 ${customer?.nickname ?? "—"}（引き出し ${withdraw.toLocaleString()} / 購入 ${purchase.toLocaleString()}）`,
    target_type: "user",
    target_id: userId,
    target_label: customer?.nickname ?? null,
    details: { session_id: sessionId, table_id: tableId, seat_no: seatNo, withdraw, purchase },
    actor_id: user.id,
    request,
  });

  return NextResponse.json({ sessionId });
}
