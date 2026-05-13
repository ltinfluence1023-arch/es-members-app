import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

async function requireMaster(userId: string) {
  const { data } = await createAdminClient()
    .from("admin_users")
    .select("id, role")
    .eq("id", userId)
    .single();
  return data?.role === "admin" ? data : null;
}

// Removes any rows from public.users whose ID matches an admin_users entry.
// Used to clean up rows auto-inserted by the Supabase trigger before this fix.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireMaster(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = createAdminClient();
  const { data: admins } = await adminClient.from("admin_users").select("id");
  const adminIds = (admins ?? []).map((a) => a.id);
  if (adminIds.length === 0) return NextResponse.json({ removed: 0 });

  const { count } = await adminClient
    .from("users")
    .delete({ count: "exact" })
    .in("id", adminIds);

  return NextResponse.json({ removed: count ?? 0 });
}
