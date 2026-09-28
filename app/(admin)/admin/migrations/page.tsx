import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { isMaster } from "@/lib/admin/auth";
import { MigrationsReview, type MigrationRequestView } from "@/components/admin/MigrationsReview";

export const dynamic = "force-dynamic";

export default async function AdminMigrationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin-login");
  if (!(await isMaster(user.id))) redirect("/admin");

  const adminClient = createAdminClient();
  const [{ data: pendingRows }, { data: processedRows }] = await Promise.all([
    adminClient
      .from("legacy_migration_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    adminClient
      .from("legacy_migration_requests")
      .select("*")
      .neq("status", "pending")
      .order("reviewed_at", { ascending: false })
      .limit(50),
  ]);

  const rows = [...(pendingRows ?? []), ...(processedRows ?? [])];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const reviewerIds = [...new Set(rows.map((r) => r.reviewed_by).filter((v): v is string => !!v))];
  const [{ data: users }, { data: reviewers }] = await Promise.all([
    userIds.length
      ? adminClient.from("users").select("id, nickname, avatar_url, chip_balance, created_at").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; nickname: string; avatar_url: string | null; chip_balance: number; created_at: string }[] }),
    reviewerIds.length
      ? adminClient.from("admin_users").select("id, name").in("id", reviewerIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const userMap = new Map((users ?? []).map((u) => [u.id, u]));
  const reviewerMap = new Map((reviewers ?? []).map((a) => [a.id, a.name]));

  const toView = (r: (typeof rows)[number]): MigrationRequestView => ({
    id: r.id,
    legacyMemberId: r.legacy_member_id,
    legacyName: r.legacy_name,
    reportedChips: r.reported_chips,
    status: r.status,
    grantedChips: r.granted_chips,
    reviewNote: r.review_note,
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
    reviewerName: r.reviewed_by ? reviewerMap.get(r.reviewed_by) ?? null : null,
    user: userMap.get(r.user_id) ?? { id: r.user_id, nickname: "（退会済み）", avatar_url: null, chip_balance: 0, created_at: r.created_at },
  });

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">旧アプリ引き継ぎ</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          お客様からの申請を旧アプリのデータと照合し、承認するとチップが残高に加算されます（ランキングには含まれません）。
        </p>
      </div>
      <MigrationsReview pending={(pendingRows ?? []).map(toView)} processed={(processedRows ?? []).map(toView)} />
    </div>
  );
}
