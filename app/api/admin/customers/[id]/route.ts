import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { isMaster } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isMaster(user.id))) {
    return NextResponse.json({ error: "顧客の削除はマスター権限のみ可能です" }, { status: 403 });
  }

  const adminClient = createAdminClient();

  // Verify target exists in customer table
  const { data: target } = await adminClient
    .from("users")
    .select("id, nickname")
    .eq("id", id)
    .single();
  if (!target) return NextResponse.json({ error: "顧客が見つかりません" }, { status: 404 });

  // chip_transactions.from_user_id / to_user_id reference users(id) WITHOUT cascade — null them out
  // to preserve operation history while allowing the user row to be deleted.
  await adminClient.from("chip_transactions").update({ from_user_id: null }).eq("from_user_id", id);
  await adminClient.from("chip_transactions").update({ to_user_id: null }).eq("to_user_id", id);

  // Other tables (visits, point_transactions, coupons, qr_tokens) have ON DELETE CASCADE
  // and will be removed automatically when public.users row is deleted.
  const { error: delUserErr } = await adminClient.from("users").delete().eq("id", id);
  if (delUserErr) return NextResponse.json({ error: delUserErr.message }, { status: 500 });

  // Remove the auth user as well so the email can be reused later
  const { error: delAuthErr } = await adminClient.auth.admin.deleteUser(id);

  await recordAudit({
    action: "customer_delete",
    category: "customer",
    summary: `顧客「${target.nickname}」を削除`,
    target_type: "user", target_id: id, target_label: target.nickname,
    actor_id: user.id, request,
  });

  if (delAuthErr) {
    return NextResponse.json({ success: true, warning: delAuthErr.message });
  }
  return NextResponse.json({ success: true });
}
