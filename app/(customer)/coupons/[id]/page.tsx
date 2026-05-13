import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { CouponUseClient } from "@/components/customer/CouponUseClient";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CouponDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminClient = createAdminClient();

  const { data: coupon } = await adminClient
    .from("coupons")
    .select("id, user_id, source, issued_at, expires_at, used_at, template_id")
    .eq("id", id)
    .single();
  if (!coupon || coupon.user_id !== user.id) notFound();

  const { data: template } = await adminClient
    .from("coupon_templates")
    .select("name, subtitle, description, notice, image_url")
    .eq("id", coupon.template_id)
    .single();

  if (!template) notFound();

  const isUsed = !!coupon.used_at;
  const isExpired = new Date(coupon.expires_at) < new Date();
  const canUse = !isUsed && !isExpired;

  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="px-4 py-4 space-y-4 animate-page-in">
      <Link href="/coupons" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft size={16} />
        クーポン一覧に戻る
      </Link>

      {/* Hero image */}
      <div
        className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, oklch(0.50 0.26 22), oklch(0.25 0.20 22))",
          boxShadow: "0 0 28px oklch(0.55 0.26 22 / 30%)",
        }}
      >
        {template.image_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={template.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white text-2xl font-black tracking-[0.4em]">COUPON</span>
          </div>
        )}
        {/* Status badge */}
        {!canUse && (
          <div className="absolute top-3 right-3 px-3 py-1 rounded text-[11px] font-black tracking-[0.18em] uppercase"
            style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}>
            {isUsed ? "使用済み" : "期限切れ"}
          </div>
        )}
      </div>

      {/* Title block */}
      <div>
        <h1 className="text-2xl font-black leading-tight">{template.name}</h1>
        {template.subtitle && (
          <p className="text-[15px] font-medium mt-1.5" style={{ color: "var(--primary)" }}>
            {template.subtitle}
          </p>
        )}
      </div>

      {/* Validity */}
      <div className="card-elevated rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground tracking-wide uppercase">有効期限</span>
        <span className="text-[14px] font-black font-mono">{fmtDate(coupon.expires_at)}</span>
      </div>

      {/* Description */}
      {template.description && (
        <div className="space-y-2">
          <p className="label-gaming">詳細</p>
          <div className="card-elevated rounded-xl px-4 py-3.5">
            <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{template.description}</p>
          </div>
        </div>
      )}

      {/* Notice */}
      {template.notice && (
        <div className="space-y-2">
          <p className="label-gaming" style={{ color: "var(--destructive)" }}>注意事項</p>
          <div
            className="rounded-xl px-4 py-3.5 border-2"
            style={{
              borderColor: "oklch(0.55 0.24 22 / 50%)",
              background: "oklch(0.16 0.04 22 / 40%)",
            }}
          >
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-foreground/90">{template.notice}</p>
          </div>
        </div>
      )}

      {/* Use button (sticky bottom) */}
      <div className="pt-4 pb-24">
        {canUse ? (
          <CouponUseClient couponId={coupon.id} />
        ) : (
          <button
            disabled
            className="w-full rounded-2xl py-4 text-[16px] font-black text-muted-foreground border-2 border-border opacity-50"
          >
            {isUsed ? "使用済みのクーポンです" : "期限切れのクーポンです"}
          </button>
        )}
      </div>
    </div>
  );
}
