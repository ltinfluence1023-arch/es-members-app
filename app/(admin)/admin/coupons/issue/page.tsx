import { createAdminClient } from "@/lib/supabase/admin";
import { CouponSegmentIssue } from "@/components/admin/CouponSegmentIssue";

export const dynamic = "force-dynamic";

export default async function AdminCouponIssuePage() {
  const adminClient = createAdminClient();

  const [{ data: templates }, { data: ranks }] = await Promise.all([
    adminClient
      .from("coupon_templates")
      .select("id, name, subtitle, image_url, valid_days, point_cost, is_active")
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    adminClient
      .from("ranks")
      .select("id, name, display_order")
      .order("display_order"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">クーポン発行</h1>
        <p className="text-sm text-muted-foreground mt-0.5">セグメント検索で対象ユーザーを絞り込み、一括で配布</p>
      </div>
      <CouponSegmentIssue templates={templates ?? []} ranks={ranks ?? []} />
    </div>
  );
}
