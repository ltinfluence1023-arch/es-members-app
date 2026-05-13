import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "@/lib/admin/audit";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await createAdminClient()
    .from("admin_users")
    .select("id, role, name")
    .eq("id", user.id)
    .single();

  if (!data) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await recordAudit({
    action: "admin_login",
    category: "auth",
    summary: `${data.name} がログイン (${data.role === "admin" ? "マスター" : "スタッフ"})`,
    actor_id: data.id, request,
  });

  return NextResponse.json({ id: data.id, role: data.role, name: data.name });
}
