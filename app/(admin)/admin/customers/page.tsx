import { createAdminClient } from "@/lib/supabase/admin";
import { AdminUserSearch } from "@/components/admin/AdminUserSearch";

export default async function AdminCustomersPage() {
  const adminClient = createAdminClient();

  const { data: users } = await adminClient
    .from("users")
    .select("id, nickname, chip_balance, point_balance, ranks(name), created_at")
    .order("created_at", { ascending: false });

  type UserRow = {
    id: string;
    nickname: string;
    chip_balance: number;
    point_balance: number;
    ranks: { name: string } | null;
    created_at: string;
  };

  const typedUsers = (users ?? []) as UserRow[];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">顧客一覧</h1>
      <AdminUserSearch users={typedUsers} />
    </div>
  );
}
