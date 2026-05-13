import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isMaster } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  subtitle: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  notice: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  point_cost: z.number().int().positive().nullable().optional(),
  valid_days: z.number().int().positive().optional(),
  max_issuance: z.number().int().positive().nullable().optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isMaster(user.id))) {
    return NextResponse.json({ error: "雛形管理はマスター権限のみ可能です" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "入力が不正です" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: before } = await adminClient
    .from("coupon_templates").select("name, is_active").eq("id", id).single();

  const { error } = await adminClient
    .from("coupon_templates").update(parsed.data).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Detect specific actions
  let action = "coupon_template_update";
  let summary = `雛形「${before?.name ?? id}」を更新`;
  if (parsed.data.is_active !== undefined && before && parsed.data.is_active !== before.is_active) {
    action = parsed.data.is_active ? "coupon_template_publish" : "coupon_template_unpublish";
    summary = `雛形「${before.name}」を${parsed.data.is_active ? "公開" : "非公開"}`;
  }

  await recordAudit({
    action, category: "coupon", summary,
    target_type: "coupon_template", target_id: id, target_label: before?.name ?? id,
    details: parsed.data as Record<string, unknown>,
    actor_id: user.id, request,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isMaster(user.id))) {
    return NextResponse.json({ error: "雛形管理はマスター権限のみ可能です" }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const { data: tpl } = await adminClient
    .from("coupon_templates").select("name").eq("id", id).single();

  const { count } = await adminClient
    .from("coupons").select("id", { count: "exact", head: true }).eq("template_id", id);

  if ((count ?? 0) > 0) {
    const { error: cErr } = await adminClient.from("coupons").delete().eq("template_id", id);
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
  }

  const { error } = await adminClient.from("coupon_templates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "coupon_template_delete",
    category: "coupon",
    summary: `雛形「${tpl?.name ?? id}」を削除（クーポン ${count ?? 0} 件も）`,
    target_type: "coupon_template", target_id: id, target_label: tpl?.name ?? id,
    details: { deleted_coupons: count ?? 0 },
    actor_id: user.id, request,
  });

  return NextResponse.json({ success: true, deletedCoupons: count ?? 0 });
}
