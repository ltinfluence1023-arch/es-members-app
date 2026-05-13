import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { CouponsClient } from "@/components/customer/CouponsClient";

export const dynamic = "force-dynamic";

type CouponTab = "available" | "used" | "exchange";

export default async function CouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { tab } = await searchParams;
  const activeTab: CouponTab = (tab as CouponTab) ?? "available";

  const adminClient = createAdminClient();

  const { data: userData } = await adminClient
    .from("users")
    .select("point_balance")
    .eq("id", user.id)
    .single();

  type CouponTplLite = {
    name: string;
    subtitle: string | null;
    description: string | null;
    notice: string | null;
    image_url: string | null;
  };
  type CouponRow = {
    id: string;
    source: string;
    issued_at: string;
    expires_at: string;
    used_at: string | null;
    coupon_templates: CouponTplLite | null;
  };

  const { data: rawCoupons } = await adminClient
    .from("coupons")
    .select("id, source, issued_at, expires_at, used_at, template_id")
    .eq("user_id", user.id)
    .order("issued_at", { ascending: false });

  const templateIds = [...new Set((rawCoupons ?? []).map((c) => c.template_id))];
  const { data: couponTemplateMap } = templateIds.length > 0
    ? await adminClient
        .from("coupon_templates")
        .select("id, name, subtitle, description, notice, image_url")
        .in("id", templateIds)
    : { data: [] };
  const tplById: Record<string, CouponTplLite> = {};
  for (const t of couponTemplateMap ?? []) {
    tplById[t.id] = {
      name: t.name,
      subtitle: t.subtitle,
      description: t.description,
      notice: t.notice,
      image_url: t.image_url,
    };
  }

  const coupons: CouponRow[] = (rawCoupons ?? []).map((c) => ({
    ...c,
    coupon_templates: tplById[c.template_id] ?? null,
  }));

  const { data: templates } = await adminClient
    .from("coupon_templates")
    .select("id, name, subtitle, description, notice, image_url, point_cost, valid_days")
    .eq("is_active", true)
    .not("point_cost", "is", null)
    .order("point_cost", { ascending: true });

  const now = new Date();
  const available = coupons.filter((c) => !c.used_at && new Date(c.expires_at) > now);
  const used = coupons.filter((c) => c.used_at || new Date(c.expires_at) <= now);

  return (
    <CouponsClient
      activeTab={activeTab}
      available={available}
      used={used}
      templates={templates ?? []}
      pointBalance={userData?.point_balance ?? 0}
      userId={user.id}
    />
  );
}
