import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin, isMaster } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";

const schema = z.object({
  name: z.string().min(1, "タイトルは必須"),
  subtitle: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  notice: z.string().nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  point_cost: z.number().int().positive().nullable().optional(),
  valid_days: z.number().int().positive().default(30),
  max_issuance: z.number().int().positive().nullable().optional(),
  is_active: z.boolean().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data } = await createAdminClient()
    .from("coupon_templates").select("*").order("created_at", { ascending: false });
  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isMaster(user.id))) {
    return NextResponse.json({ error: "雛形管理はマスター権限のみ可能です" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "入力が不正です" }, { status: 400 });
  }

  const { data, error } = await createAdminClient()
    .from("coupon_templates").insert(parsed.data).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "coupon_template_create",
    category: "coupon",
    summary: `雛形「${parsed.data.name}」を作成`,
    target_type: "coupon_template",
    target_id: data?.id,
    target_label: parsed.data.name,
    actor_id: user.id,
    request,
  });

  return NextResponse.json({ success: true, id: data?.id });
}
