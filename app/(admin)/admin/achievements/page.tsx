import { createClient } from "@/lib/supabase/server";
import { isAdmin, isMaster } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { AchievementsManager } from "@/components/admin/AchievementsManager";

export const dynamic = "force-dynamic";

export default async function AdminAchievementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) redirect("/admin-login");
  const master = await isMaster(user.id);
  return <AchievementsManager isMaster={master} />;
}
