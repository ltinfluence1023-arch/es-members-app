import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { pokerErrorMessage, seatLabel } from "@/lib/admin/poker";

const schema = z.object({
  sessionId: z.string().uuid(),
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
  const { sessionId, withdraw, purchase } = parsed.data;

  const adminClient = createAdminClient();
  const { data: session } = await adminClient
    .from("poker_sessions")
    .select("user_id, table_id, seat_no")
    .eq("id", sessionId)
    .single();
  if (!session) return NextResponse.json({ error: pokerErrorMessage("SESSION_NOT_FOUND") }, { status: 404 });

  const [{ data: table }, { data: customer }] = await Promise.all([
    adminClient.from("poker_tables").select("name").eq("id", session.table_id).single(),
    adminClient.from("users").select("nickname").eq("id", session.user_id).single(),
  ]);
  const where = `${table?.name ?? "ポーカー"} ${seatLabel(session.seat_no)}`;

  const { error } = await adminClient.rpc("poker_add_chips", {
    p_session_id: sessionId,
    p_withdraw: withdraw,
    p_purchase: purchase,
    p_staff_id: user.id,
    p_memo: `${where} 追加`,
  });
  if (error) return NextResponse.json({ error: pokerErrorMessage(error.message) }, { status: 400 });

  await recordAudit({
    action: "poker_add_chips",
    category: "poker",
    summary: `${where} 追加 ${customer?.nickname ?? "—"}（引き出し ${withdraw.toLocaleString()} / 購入 ${purchase.toLocaleString()}）`,
    target_type: "user",
    target_id: session.user_id,
    target_label: customer?.nickname ?? null,
    details: { session_id: sessionId, withdraw, purchase },
    actor_id: user.id,
    request,
  });

  return NextResponse.json({ success: true });
}
