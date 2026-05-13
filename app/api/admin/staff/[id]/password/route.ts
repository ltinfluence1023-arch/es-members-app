import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { isMaster } from "@/lib/admin/auth";

// GET: master views the stored password for a staff account.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isMaster(user.id))) {
    return NextResponse.json({ error: "マスター権限のみ閲覧可能です" }, { status: 403 });
  }

  const { data } = await createAdminClient()
    .from("admin_users")
    .select("password_plain")
    .eq("id", id)
    .single();

  return NextResponse.json({ password: data?.password_plain ?? null });
}
