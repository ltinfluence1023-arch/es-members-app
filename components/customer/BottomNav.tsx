"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, History, QrCode, Trophy, Ticket, Award } from "lucide-react";

const LEFT_ITEMS = [
  { href: "/home",         icon: House,   label: "ホーム" },
  { href: "/history",      icon: History, label: "履歴" },
];

const RIGHT_ITEMS = [
  { href: "/achievements", icon: Award,   label: "実績" },
  { href: "/ranking",      icon: Trophy,  label: "ランキング" },
  { href: "/coupons",      icon: Ticket,  label: "クーポン" },
];

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-md mx-auto relative">
        <div
          className="flex items-end h-[72px] backdrop-blur-md border-t-2"
          style={{
            background: "linear-gradient(180deg, oklch(0.10 0.014 22 / 95%) 0%, oklch(0.07 0.012 22 / 98%) 100%)",
            borderTopColor: "oklch(0.63 0.26 22 / 35%)",
            boxShadow: "0 -4px 24px oklch(0.55 0.26 22 / 18%)",
          }}
        >
          {LEFT_ITEMS.map(({ href, icon: Icon, label }) => (
            <NavBtn key={href} href={href} Icon={Icon} label={label} active={isActive(href)} />
          ))}
          <div className="w-20 flex-shrink-0" />
          {RIGHT_ITEMS.map(({ href, icon: Icon, label }) => (
            <NavBtn key={href} href={href} Icon={Icon} label={label} active={isActive(href)} />
          ))}
        </div>

        {/* Center QR button */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-2 flex flex-col items-center gap-1">
          <Link href="/qr" className="transition-all duration-150 active:scale-90 active:opacity-90">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div
                className="ring-expand absolute inset-0 rounded-full"
                style={{ border: "2px solid oklch(0.65 0.26 22 / 55%)" }}
              />
              <div
                className="ring-expand absolute inset-0 rounded-full"
                style={{ border: "2px solid oklch(0.65 0.26 22 / 35%)", animationDelay: "1s" }}
              />
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center relative"
                style={{
                  background: "radial-gradient(circle at 30% 30%, oklch(0.74 0.26 22) 0%, oklch(0.50 0.24 22) 100%)",
                  boxShadow:
                    "0 0 36px oklch(0.65 0.26 22 / 75%), 0 0 72px oklch(0.55 0.26 22 / 40%), 0 4px 14px rgba(0,0,0,0.55), 0 0 0 3px oklch(0.05 0.012 22)",
                }}
              >
                <QrCode size={30} className="text-white drop-shadow-lg" strokeWidth={2.4} />
              </div>
            </div>
          </Link>
          <span
            className="text-[11px] font-black tracking-[0.18em] uppercase"
            style={{
              color: isActive("/qr") ? "var(--primary)" : "rgba(255,255,255,0.82)",
              textShadow: isActive("/qr") ? "0 0 8px oklch(0.65 0.26 22 / 60%)" : undefined,
            }}
          >
            QR
          </span>
        </div>
      </div>
    </nav>
  );
}

function NavBtn({
  href, Icon, label, active,
}: {
  href: string; Icon: React.ElementType; label: string; active: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex-1 flex flex-col items-center justify-end pb-2.5 gap-1 transition-all duration-150 active:scale-90 active:opacity-70"
    >
      <div className="relative flex items-center justify-center">
        {active && (
          <div
            className="absolute inset-[-6px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, oklch(0.65 0.26 22 / 30%) 0%, transparent 70%)" }}
          />
        )}
        <Icon
          size={22}
          strokeWidth={active ? 2.6 : 2.0}
          style={{
            color: active ? "var(--primary)" : "rgba(255,255,255,0.62)",
            filter: active ? "drop-shadow(0 0 12px oklch(0.65 0.26 22 / 80%))" : undefined,
          }}
          className={`transition-transform duration-200 ${active ? "scale-110" : ""}`}
        />
      </div>
      <span
        className="text-[10px] font-bold tracking-wide transition-colors duration-200"
        style={{
          color: active ? "var(--primary)" : "rgba(255,255,255,0.52)",
          textShadow: active ? "0 0 8px oklch(0.65 0.26 22 / 55%)" : undefined,
        }}
      >
        {label}
      </span>
      <div
        className="w-1 h-1 rounded-full transition-all duration-300"
        style={{
          background: active ? "var(--primary)" : "transparent",
          boxShadow: active ? "0 0 6px var(--primary)" : undefined,
        }}
      />
    </Link>
  );
}
