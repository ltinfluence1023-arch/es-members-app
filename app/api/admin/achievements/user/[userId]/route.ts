import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin/auth";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ userId: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;
  const adminClient = createAdminClient();

  const { data } = await adminClient
    .from("user_achievements")
    .select("achievement_id, achieved_at")
    .eq("user_id", userId);

  return NextResponse.json(data ?? []);
}
