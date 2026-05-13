import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AchievementsClient } from "@/components/customer/AchievementsClient";

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <AchievementsClient />;
}
