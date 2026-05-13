import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReportsClient } from "@/components/admin/ReportsClient";

async function isAdmin(userId: string) {
  const { data } = await createAdminClient()
    .from("admin_users")
    .select("id")
    .eq("id", userId)
    .single();
  return !!data;
}

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin-login");
  if (!(await isAdmin(user.id))) redirect("/admin-login");

  // Pass placeholder; ReportsClient fetches its own data on mount
  const placeholder = {
    period: "day" as const,
    label: "—",
    range: { start: "", end: "" },
    totalUsers: 0,
    newUsersInPeriod: 0,
    checkinCount: 0,
    flow: { transfer: 0, adminGrant: 0, adminReduction: 0, checkin: 0, gdp: 0 },
    dailyChart: [],
    topChip: [],
    topPoint: [],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">レポート</h1>
        <p className="text-sm text-muted-foreground mt-0.5">日別・月別の統計とチップフロー</p>
      </div>
      <ReportsClient initialData={placeholder} />
    </div>
  );
}
