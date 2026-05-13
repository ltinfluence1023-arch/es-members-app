import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isMaster } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";

const schema = z.object({
  userIds: z.array(z.string().uuid()).min(1, "対象ユーザーを選択してください"),
  templateId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isMaster(user.id))) {
    return NextResponse.json({ error: "クーポン発行はマスター権限のみ可能です" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "入力が不正です" }, { status: 400 });
  }

  const { userIds, templateId } = parsed.data;
  const adminClient = createAdminClient();

  const { data: template } = await adminClient
    .from("coupon_templates")
    .select("valid_days, is_active, name")
    .eq("id", templateId)
    .single();

  if (!template || !template.is_active) {
    return NextResponse.json({ error: "テンプレートが無効です" }, { status: 400 });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + template.valid_days);

  const rows = userIds.map((uid) => ({
    template_id: templateId,
    user_id: uid,
    source: "admin_grant" as const,
    expires_at: expiresAt.toISOString(),
  }));

  const { error } = await adminClient.from("coupons").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "coupon_issue",
    category: "coupon",
    summary: `「${template.name}」を ${userIds.length} 名に発行`,
    target_type: "coupon_template",
    target_id: templateId,
    target_label: template.name,
    details: { user_count: userIds.length, user_ids: userIds },
    actor_id: user.id,
    request,
  });

  return NextResponse.json({ success: true, issued: userIds.length });
}
