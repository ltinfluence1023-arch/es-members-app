import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";

const schema = z.object({
  password: z.string().min(8, "パスワードは8文字以上"),
});

// PATCH: an admin (master or staff) changes their OWN password.
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "入力が不正です" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Update Supabase Auth password
  const { error: authErr } = await adminClient.auth.admin.updateUserById(user.id, { password: parsed.data.password });
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

  // Update stored plaintext copy so master can still view current credential
  await adminClient
    .from("admin_users")
    .update({ password_plain: parsed.data.password })
    .eq("id", user.id);

  await recordAudit({
    action: "admin_password_change",
    category: "auth",
    summary: "自身のパスワードを変更",
    actor_id: user.id, request,
  });

  return NextResponse.json({ success: true });
}
