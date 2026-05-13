import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

async function isAdmin(userId: string) {
  const { data } = await createAdminClient()
    .from("admin_users").select("id").eq("id", userId).single();
  return !!data;
}

// Returns the number of issued coupons for the given template.
// Used by the UI to show a clear confirmation before destructive deletion.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = createAdminClient();
  const { count: total } = await adminClient
    .from("coupons")
    .select("id", { count: "exact", head: true })
    .eq("template_id", id);

  const { count: unused } = await adminClient
    .from("coupons")
    .select("id", { count: "exact", head: true })
    .eq("template_id", id)
    .is("used_at", null);

  return NextResponse.json({ total: total ?? 0, unused: unused ?? 0 });
}
