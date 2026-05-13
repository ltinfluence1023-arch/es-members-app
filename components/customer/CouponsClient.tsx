"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

type CouponTab = "available" | "used" | "exchange";

interface CouponItem {
  id: string;
  source: string;
  issued_at: string;
  expires_at: string;
  used_at: string | null;
  coupon_templates: {
    name: string;
    subtitle: string | null;
    description: string | null;
    notice: string | null;
    image_url: string | null;
  } | null;
}

interface Template {
  id: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  notice: string | null;
  image_url: string | null;
  point_cost: number | null;
  valid_days: number;
}

interface Props {
  activeTab: CouponTab;
  available: CouponItem[];
  used: CouponItem[];
  templates: Template[];
  pointBalance: number;
  userId: string;
}

const TABS: { key: CouponTab; label: string }[] = [
  { key: "available", label: "利用可能" },
  { key: "used",      label: "使用済み" },
  { key: "exchange",  label: "交換する" },
];

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("ja-JP", { year: "numeric", month: "numeric", day: "numeric" });
}

export function CouponsClient({ activeTab, available, used, templates, pointBalance }: Props) {
  const router = useRouter();
  const [exchanging, setExchanging] = useState<string | null>(null);

  async function handleExchange(templateId: string, pointCost: number) {
    if (pointBalance < pointCost) { toast.error("ポイントが不足しています"); return; }
    setExchanging(templateId);
    try {
      const res = await fetch("/api/coupons/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("クーポンを取得しました");
      router.push("/coupons?tab=available");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setExchanging(null);
    }
  }

  return (
    <div className="px-4 py-5 space-y-4 animate-page-in">
      <h1 className="heading-gaming text-xl">Coupons</h1>

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/coupons?tab=${t.key}`}
            className={`flex-1 text-center px-3 py-2.5 rounded-full text-[14px] font-black tracking-wide transition-all interactive ${
              activeTab === t.key ? "text-white" : "border-2 border-border text-muted-foreground"
            }`}
            style={activeTab === t.key ? {
              background: "var(--primary)",
              boxShadow: "0 0 16px oklch(0.65 0.26 22 / 45%), inset 0 0 12px oklch(0.50 0.26 22 / 40%)",
            } : undefined}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Available coupons — list view */}
      {activeTab === "available" && (
        <div className="space-y-2.5">
          {available.length === 0 ? (
            <div className="card-elevated rounded-2xl p-8 text-center text-sm text-muted-foreground">
              利用可能なクーポンはありません
            </div>
          ) : (
            available.map((c) => (
              <Link
                key={c.id}
                href={`/coupons/${c.id}`}
                className="card-elevated rounded-2xl flex items-center gap-3 p-3 interactive"
              >
                {/* Thumbnail */}
                <div
                  className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center"
                  style={{
                    background: c.coupon_templates?.image_url
                      ? "transparent"
                      : "linear-gradient(135deg, oklch(0.50 0.26 22), oklch(0.30 0.20 22))",
                    boxShadow: "0 0 14px oklch(0.55 0.26 22 / 25%)",
                  }}
                >
                  {c.coupon_templates?.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={c.coupon_templates.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-[10px] font-black tracking-[0.2em]">COUPON</span>
                  )}
                </div>
                {/* Body */}
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-black leading-tight truncate">
                    {c.coupon_templates?.name}
                  </p>
                  {c.coupon_templates?.subtitle && (
                    <p className="text-[13px] text-muted-foreground font-medium leading-tight truncate mt-0.5">
                      {c.coupon_templates.subtitle}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground font-mono mt-1">
                    〜{fmtDate(c.expires_at)}
                  </p>
                </div>
                <ChevronRight size={18} style={{ color: "var(--primary)" }} className="flex-shrink-0" />
              </Link>
            ))
          )}
        </div>
      )}

      {/* Used coupons */}
      {activeTab === "used" && (
        <div className="space-y-2.5">
          {used.length === 0 ? (
            <div className="card-elevated rounded-2xl p-8 text-center text-sm text-muted-foreground">
              使用済みクーポンはありません
            </div>
          ) : (
            used.map((c) => (
              <div key={c.id} className="card-elevated rounded-2xl flex items-center gap-3 p-3 opacity-55">
                <div
                  className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center"
                  style={{
                    background: c.coupon_templates?.image_url
                      ? "transparent"
                      : "linear-gradient(135deg, oklch(0.40 0.16 22), oklch(0.22 0.12 22))",
                  }}
                >
                  {c.coupon_templates?.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={c.coupon_templates.image_url} alt="" className="w-full h-full object-cover grayscale" />
                  ) : (
                    <span className="text-white text-[9px] font-black tracking-[0.2em]">USED</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold leading-tight truncate">{c.coupon_templates?.name}</p>
                  {c.coupon_templates?.subtitle && (
                    <p className="text-[12px] text-muted-foreground truncate mt-0.5">{c.coupon_templates.subtitle}</p>
                  )}
                  <p className="text-[12px] text-muted-foreground mt-1 font-mono">
                    {c.used_at ? `使用日: ${fmtDate(c.used_at)}` : `期限切れ: ${fmtDate(c.expires_at)}`}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Exchange */}
      {activeTab === "exchange" && (
        <div className="space-y-4">
          <div className="card-elevated rounded-2xl px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">💎 ポイント残高</p>
            <p className="text-2xl font-black tabular-nums" style={{ color: "var(--point)" }}>
              {pointBalance.toLocaleString()}<span className="text-sm font-normal ml-1">pt</span>
            </p>
          </div>

          {templates.length === 0 ? (
            <div className="card-elevated rounded-2xl p-8 text-center text-sm text-muted-foreground">
              交換できるクーポンはありません
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <div key={t.id} className="card-elevated rounded-2xl overflow-hidden">
                  {/* Hero image */}
                  <div
                    className="w-full aspect-[16/9] relative"
                    style={{
                      background: t.image_url
                        ? "transparent"
                        : "linear-gradient(135deg, oklch(0.50 0.26 22), oklch(0.30 0.20 22))",
                    }}
                  >
                    {t.image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={t.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white text-2xl font-black tracking-[0.4em]">COUPON</span>
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-4 space-y-3">
                    <div>
                      <p className="text-[17px] font-black leading-tight">{t.name}</p>
                      {t.subtitle && <p className="text-[13px] mt-1" style={{ color: "var(--primary)" }}>{t.subtitle}</p>}
                      {t.description && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{t.description}</p>}
                      <p className="text-[12px] text-muted-foreground font-mono mt-2">有効期間: {t.valid_days}日間</p>
                    </div>
                    <button
                      onClick={() => handleExchange(t.id, t.point_cost!)}
                      disabled={exchanging === t.id || pointBalance < t.point_cost!}
                      className="w-full rounded-xl py-3 text-[15px] font-black text-white interactive disabled:opacity-40"
                      style={{
                        background: "var(--primary)",
                        boxShadow: "0 0 14px oklch(0.65 0.26 22 / 35%)",
                      }}
                    >
                      {exchanging === t.id ? "処理中..." : `${t.point_cost!.toLocaleString()} pt で交換`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
