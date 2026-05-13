import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Use admin client for own balance to bypass any RLS issues.
  const { data } = await createAdminClient()
    .from("users")
    .select("chip_balance, point_balance")
    .eq("id", user.id)
    .single();

  return NextResponse.json(
    {
      chip_balance: data?.chip_balance ?? 0,
      point_balance: data?.point_balance ?? 0,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
