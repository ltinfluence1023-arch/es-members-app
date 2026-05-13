import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AuditLogsClient } from "@/components/admin/AuditLogsClient";
import { isMaster } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin-login");
  if (!(await isMaster(user.id))) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">操作ログ</h1>
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          このページはマスターアカウントのみ閲覧できます
        </div>
      </div>
    );
  }

  const adminClient = createAdminClient();
  const { data: logs } = await adminClient
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">操作ログ</h1>
        <p className="text-sm text-muted-foreground mt-0.5">管理画面の全操作・ログイン履歴</p>
      </div>
      <AuditLogsClient initialLogs={logs ?? []} />
    </div>
  );
}
