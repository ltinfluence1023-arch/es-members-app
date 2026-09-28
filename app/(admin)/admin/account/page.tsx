import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminInfo } from "@/lib/admin/auth";
import { ROLE_LABEL } from "@/lib/admin/permissions";
import { MyPasswordForm } from "@/components/admin/MyPasswordForm";

export default async function AdminAccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin-login");
  const me = await getAdminInfo(user.id);
  if (!me) redirect("/admin-login");

  return (
    <div className="max-w-md space-y-4">
      <div>
        <h1 className="text-xl font-bold">アカウント</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {me.name}（{ROLE_LABEL[me.role]}）
        </p>
      </div>
      <MyPasswordForm />
    </div>
  );
}
