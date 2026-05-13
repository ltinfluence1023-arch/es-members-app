import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMaster } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { NextRequest, NextResponse } from "next/server";

// PATCH: points / chip_reward / is_active の更新（マスターのみ）
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isMaster(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  // 更新可能フィールドのみ抽出
  type AchUpdate = { points?: number; chip_reward?: number; is_active?: boolean };
  const allowed: AchUpdate = {};
  if (typeof body.points      === "number") allowed.points      = Math.max(0, body.points);
  if (typeof body.chip_reward === "number") allowed.chip_reward = Math.max(0, body.chip_reward);
  if (typeof body.is_active   === "boolean") allowed.is_active  = body.is_active;

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("achievements")
    .update(allowed)
    .eq("id", id)
    .select("name")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "update", category: "other",
    summary: `アチーブメント設定変更: ${data.name} ${JSON.stringify(allowed)}`,
    target_type: "achievement", target_id: id, target_label: data.name,
    actor_id: user.id, request,
  });

  return NextResponse.json({ ok: true });
}
