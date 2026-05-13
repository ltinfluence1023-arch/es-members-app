import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ADMIN_EMAIL_DOMAIN = "admin.local";

const createSchema = z.object({
  loginId: z.string()
    .min(3, "ログインIDは3文字以上")
    .max(32, "ログインIDは32文字以内")
    .regex(/^[a-zA-Z0-9_.-]+$/, "英数字・_ . - のみ使用可"),
  password: z.string().min(8, "パスワードは8文字以上"),
  name: z.string().min(1, "名前は必須"),
  role: z.enum(["admin", "staff"]).default("staff"),
});

async function requireMaster(userId: string) {
  const { data } = await createAdminClient()
    .from("admin_users")
    .select("id, role")
    .eq("id", userId)
    .single();
  return data?.role === "admin" ? data : null;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireMaster(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data } = await createAdminClient()
    .from("admin_users")
    .select("id, email, name, role, created_at")
    .order("created_at", { ascending: true });

  return NextResponse.json({ staff: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireMaster(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "入力が不正です" }, { status: 400 });
  }

  const { loginId, password, name, role } = parsed.data;
  const email = `${loginId.toLowerCase()}@${ADMIN_EMAIL_DOMAIN}`;
  const adminClient = createAdminClient();

  // Check if loginId already used among admins
  const { data: existing } = await adminClient
    .from("admin_users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "このログインIDは既に使われています" }, { status: 400 });
  }

  // Create auth user with synthetic email (separate from customer accounts)
  const { data: created, error: authErr } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authErr || !created.user) {
    return NextResponse.json({ error: authErr?.message ?? "ユーザー作成に失敗しました" }, { status: 500 });
  }

  // Insert into admin_users (store plaintext password so master can view it later)
  const { error: insertErr } = await adminClient.from("admin_users").insert({
    id: created.user.id,
    email,
    name,
    role,
    password_plain: password,
  });
  if (insertErr) {
    // Rollback auth user
    await adminClient.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Remove the auto-created customer row (DB trigger inserts into public.users on every auth.users INSERT).
  // Admin accounts must NOT appear in the customer-facing users table.
  await adminClient.from("users").delete().eq("id", created.user.id);

  return NextResponse.json({ success: true, id: created.user.id });
}
