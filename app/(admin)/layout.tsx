import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin-login");

  const { data: me } = await createAdminClient()
    .from("admin_users")
    .select("id, name, role")
    .eq("id", user.id)
    .single();

  if (!me) redirect("/admin-login");

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar isMaster={me.role === "admin"} currentName={me.name} />
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
