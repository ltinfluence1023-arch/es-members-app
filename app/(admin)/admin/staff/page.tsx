import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StaffManager } from "@/components/admin/StaffManager";

export default async function StaffPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin-login");

  const adminClient = createAdminClient();
  const { data: me } = await adminClient
    .from("admin_users")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!me) redirect("/admin-login");
  if (me.role !== "admin") {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">スタッフ管理</h1>
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          このページはマスターアカウントのみ閲覧できます
        </div>
      </div>
    );
  }

  const { data: staff } = await adminClient
    .from("admin_users")
    .select("id, email, name, role, created_at")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">スタッフ管理</h1>
        <p className="text-sm text-muted-foreground mt-0.5">マスターアカウント・スタッフアカウントの管理</p>
      </div>
      <StaffManager initialStaff={staff ?? []} currentUserId={user.id} />
    </div>
  );
}
