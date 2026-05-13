import { createAdminClient } from "@/lib/supabase/admin";
import { ChipOperationClient } from "@/components/admin/ChipOperationClient";

export default async function AdminChipsPage() {
  const adminClient = createAdminClient();

  const { data: users } = await adminClient
    .from("users")
    .select("id, nickname, chip_balance")
    .order("nickname");

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-semibold">チップ付与 / 減算</h1>
        <p className="text-sm text-muted-foreground mt-1">
          チップ購入時の付与、返金・訂正時の減算を行います。
        </p>
      </div>
      <ChipOperationClient users={users ?? []} />
    </div>
  );
}
