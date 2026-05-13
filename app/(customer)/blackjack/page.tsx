import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { BlackjackGame } from "@/components/customer/BlackjackGame";

export const dynamic = "force-dynamic";

export default async function BlackjackPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await createAdminClient()
    .from("users")
    .select("chip_balance")
    .eq("id", user.id)
    .single();

  return <BlackjackGame initialBalance={data?.chip_balance ?? 0} />;
}
