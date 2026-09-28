import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminInfo } from "@/lib/admin/auth";
import { adminHomePath } from "@/lib/admin/permissions";

export default async function AdminRootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin-login");
  const me = await getAdminInfo(user.id);
  if (!me) redirect("/admin-login");
  redirect(adminHomePath(me.role));
}
