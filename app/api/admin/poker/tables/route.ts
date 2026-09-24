import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isMaster } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";

const schema = z.object({ name: z.string().trim().min(1).max(20) });

// 卓の追加（マスターのみ）
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isMaster(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "テーブル名を入力してください" }, { status: 400 });

  const adminClient = createAdminClient();
  const { data: last } = await adminClient
    .from("poker_tables").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();

  const { data: table, error } = await adminClient
    .from("poker_tables")
    .insert({ name: parsed.data.name, sort_order: (last?.sort_order ?? 0) + 1 })
    .select("id, name")
    .single();
  if (error || !table) return NextResponse.json({ error: "テーブルの追加に失敗しました" }, { status: 500 });

  await recordAudit({
    action: "poker_table_create",
    category: "poker",
    summary: `テーブル追加: ${table.name}`,
    target_type: "poker_table",
    target_id: table.id,
    target_label: table.name,
    actor_id: user.id,
    request,
  });

  return NextResponse.json({ table });
}
