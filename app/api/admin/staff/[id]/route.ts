import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordAudit } from "@/lib/admin/audit";
import { ROLE_LABEL } from "@/lib/admin/permissions";

async function requireMaster(userId: string) {
  const { data } = await createAdminClient()
    .from("admin_users")
    .select("id, role")
    .eq("id", userId)
    .single();
  return data?.role === "admin" ? data : null;
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireMaster(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (id === user.id) return NextResponse.json({ error: "自分自身は削除できません" }, { status: 400 });

  const adminClient = createAdminClient();

  // If target is master, check there will be at least one master remaining
  const { data: target } = await adminClient
    .from("admin_users")
    .select("id, role")
    .eq("id", id)
    .single();
  if (!target) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

  if (target.role === "admin") {
    const { count } = await adminClient
      .from("admin_users")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: "最後のマスターアカウントは削除できません" }, { status: 400 });
    }
  }

  // Null out FK references to this admin so that operation history is preserved
  // but the row can be deleted (default RESTRICT would otherwise block deletion).
  await adminClient.from("chip_transactions").update({ created_by: null }).eq("created_by", id);
  await adminClient.from("point_transactions").update({ created_by: null }).eq("created_by", id);
  await adminClient.from("coupons").update({ used_by: null }).eq("used_by", id);

  // Explicitly delete the admin_users row first (in case CASCADE is missing on the FK to auth.users)
  await adminClient.from("admin_users").delete().eq("id", id);

  // Then delete the auth user
  const { error: delErr } = await adminClient.auth.admin.deleteUser(id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "staff", "dealer"]).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireMaster(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "入力が不正です" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { name, role } = parsed.data;

  if (name !== undefined || role !== undefined) {
    // If demoting last master, block
    if (role !== undefined && role !== "admin" && id !== user.id) {
      const { data: target } = await adminClient
        .from("admin_users")
        .select("role")
        .eq("id", id)
        .single();
      if (target?.role === "admin") {
        const { count } = await adminClient
          .from("admin_users")
          .select("id", { count: "exact", head: true })
          .eq("role", "admin");
        if ((count ?? 0) <= 1) {
          return NextResponse.json({ error: "最後のマスターアカウントは降格できません" }, { status: 400 });
        }
      }
    }
    const update: { name?: string; role?: "admin" | "staff" | "dealer" } = {};
    if (name !== undefined) update.name = name;
    if (role !== undefined) update.role = role;
    const { data: updated, error } = await adminClient
      .from("admin_users").update(update).eq("id", id).select("name, role").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await recordAudit({
      action: role !== undefined ? "staff_role_change" : "staff_update",
      category: "staff",
      summary: role !== undefined
        ? `${updated?.name ?? "—"} の権限を${ROLE_LABEL[role]}に変更`
        : `${updated?.name ?? "—"} の情報を更新`,
      target_type: "admin_user",
      target_id: id,
      target_label: updated?.name ?? null,
      details: update,
      actor_id: user.id,
      request,
    });
  }


  return NextResponse.json({ success: true });
}
