import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isMaster } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";

const schema = z.object({
  name: z.string().trim().min(1).max(20).optional(),
  isActive: z.boolean().optional(),
});

// 卓名の変更・使用停止/再開（マスターのみ）
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isMaster(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
  const { name, isActive } = parsed.data;

  const adminClient = createAdminClient();

  if (isActive === false) {
    const { count } = await adminClient
      .from("poker_sessions").select("id", { count: "exact", head: true })
      .eq("table_id", id).eq("status", "seated");
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: "着席中のお客様がいるため停止できません" }, { status: 400 });
    }
  }

  const { data: table, error } = await adminClient
    .from("poker_tables")
    .update({ ...(name !== undefined ? { name } : {}), ...(isActive !== undefined ? { is_active: isActive } : {}) })
    .eq("id", id)
    .select("id, name, is_active")
    .single();
  if (error || !table) return NextResponse.json({ error: "テーブルの更新に失敗しました" }, { status: 500 });

  await recordAudit({
    action: "poker_table_update",
    category: "poker",
    summary: `テーブル更新: ${table.name}${isActive === undefined ? "" : isActive ? "（再開）" : "（停止）"}`,
    target_type: "poker_table",
    target_id: table.id,
    target_label: table.name,
    details: parsed.data,
    actor_id: user.id,
    request,
  });

  return NextResponse.json({ table });
}
