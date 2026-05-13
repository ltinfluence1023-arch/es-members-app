import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FeesClient } from "@/components/admin/FeesClient";
import { getAdminInfo } from "@/lib/admin/auth";

export default async function FeesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin-login");
  const me = await getAdminInfo(user.id);
  if (!me) redirect("/admin-login");
  const isMaster = me.role === "admin";

  const adminClient = createAdminClient();

  const { data: allFees } = await adminClient.from("fee_transactions").select("amount, source");
  const total = (allFees ?? []).reduce((s, r) => s + r.amount, 0);
  const transferFees = (allFees ?? []).filter((r) => r.source === "transfer_fee").reduce((s, r) => s + r.amount, 0);
  const rakeAdded = (allFees ?? []).filter((r) => r.source === "rake").reduce((s, r) => s + r.amount, 0);
  const manualAdded = (allFees ?? []).filter((r) => r.source === "manual_add").reduce((s, r) => s + r.amount, 0);
  const manualSubtracted = (allFees ?? []).filter((r) => r.source === "manual_subtract").reduce((s, r) => s + Math.abs(r.amount), 0);

  const { data: tx } = await adminClient
    .from("fee_transactions")
    .select("id, amount, source, memo, related_user_id, created_by, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const userIds = new Set<string>();
  const adminIds = new Set<string>();
  for (const t of tx ?? []) {
    if (t.related_user_id) userIds.add(t.related_user_id);
    if (t.created_by) adminIds.add(t.created_by);
  }

  const [usersRes, adminsRes] = await Promise.all([
    userIds.size
      ? adminClient.from("users").select("id, nickname").in("id", [...userIds])
      : Promise.resolve({ data: [] as { id: string; nickname: string }[] }),
    adminIds.size
      ? adminClient.from("admin_users").select("id, name").in("id", [...adminIds])
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const userMap = new Map((usersRes.data ?? []).map((u) => [u.id, u.nickname]));
  const adminMap = new Map((adminsRes.data ?? []).map((a) => [a.id, a.name]));

  const enriched = (tx ?? []).map((t) => ({
    ...t,
    relatedUserName: t.related_user_id ? (userMap.get(t.related_user_id) ?? "—") : null,
    operatorName: t.created_by ? (adminMap.get(t.created_by) ?? "—") : null,
  }));

  const initialData = {
    total,
    breakdown: { transferFees, rakeAdded, manualAdded, manualSubtracted },
    transactions: enriched,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">管理チップ残高</h1>
        <p className="text-sm text-muted-foreground mt-0.5">送付手数料・ポーカーレーキ・手動増減の管理</p>
      </div>
      <FeesClient initialData={initialData} isMaster={isMaster} />
    </div>
  );
}
