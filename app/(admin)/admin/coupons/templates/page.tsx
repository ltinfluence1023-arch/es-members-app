import { createAdminClient } from "@/lib/supabase/admin";
import { CouponTemplatesManager } from "@/components/admin/CouponTemplatesManager";

export const dynamic = "force-dynamic";

export default async function AdminCouponTemplatesPage() {
  const adminClient = createAdminClient();
  const { data: templates } = await adminClient
    .from("coupon_templates")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">クーポンテンプレート</h1>
        <p className="text-sm text-muted-foreground mt-0.5">作成・編集・削除・公開切替</p>
      </div>
      <CouponTemplatesManager initialTemplates={templates ?? []} />
    </div>
  );
}
