"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Users, Ticket, Bell, LogOut, LayoutDashboard, QrCode,
  ScanLine, Menu, X, BarChart3, CalendarCheck, ShieldCheck, Coins,
  Spade, ExternalLink, FileClock, Trophy,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

type NavItem = { href: string; icon: React.ElementType; label: string; masterOnly?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const baseNavGroups: NavGroup[] = [
  {
    label: "店舗",
    items: [
      { href: "/admin/store-qr",  icon: QrCode,          label: "チェックインQR" },
      { href: "/admin/scan",      icon: ScanLine,        label: "QRスキャン" },
    ],
  },
  {
    label: "顧客管理",
    items: [
      { href: "/admin/checkins",     icon: CalendarCheck,   label: "チェックイン" },
      { href: "/admin/customers",    icon: Users,           label: "顧客一覧" },
      { href: "/admin/transactions", icon: LayoutDashboard, label: "取引履歴" },
      { href: "/admin/fees",         icon: Coins,           label: "管理チップ残高" },
      { href: "/admin/rankings",     icon: Trophy,          label: "ランキング履歴" },
      { href: "/admin/reports",      icon: BarChart3,       label: "レポート" },
    ],
  },
  {
    label: "クーポン",
    items: [
      { href: "/admin/coupons/templates", icon: Ticket, label: "テンプレート", masterOnly: true },
      { href: "/admin/coupons/issue",     icon: Ticket, label: "対象発行", masterOnly: true },
      { href: "/admin/coupons/redeem",    icon: Ticket, label: "消込" },
    ],
  },
  {
    label: "コンテンツ",
    items: [
      { href: "/admin/notices", icon: Bell, label: "お知らせ" },
    ],
  },
];

const masterNavGroup: NavGroup = {
  label: "システム",
  items: [
    { href: "/admin/staff",      icon: ShieldCheck, label: "スタッフ管理" },
    { href: "/admin/audit-logs", icon: FileClock,   label: "操作ログ" },
  ],
};

const POKER_SYSTEM_URL = "https://es-poker.vercel.app/login";

function SidebarContent({ onClose, isMaster, currentName }: { onClose?: () => void; isMaster: boolean; currentName: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [openingPoker, setOpeningPoker] = useState(false);

  const navGroups: NavGroup[] = isMaster
    ? [...baseNavGroups, masterNavGroup]
    : baseNavGroups.map((g) => ({ ...g, items: g.items.filter((i) => !i.masterOnly) }));

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin-login");
    router.refresh();
  }

  // Open poker management system with the current Supabase session (SSO handoff).
  // Tokens are placed in the URL fragment so they don't hit server logs.
  async function handleOpenPoker() {
    setOpeningPoker(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      let url = POKER_SYSTEM_URL;
      if (session?.access_token && session?.refresh_token) {
        const params = new URLSearchParams({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: String(session.expires_in ?? 3600),
          token_type: "bearer",
          type: "magiclink",
        });
        url = `${POKER_SYSTEM_URL}#${params.toString()}`;
      }

      // PWA / standalone mode (iOS) blocks window.open(_blank) — use direct navigation.
      // Detect standalone mode and pick the right strategy.
      const isStandalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        // @ts-expect-error iOS-specific
        window.navigator.standalone === true;

      onClose?.();

      if (isStandalone) {
        // Direct navigation (will open in default browser due to scope mismatch on iOS PWA)
        window.location.href = url;
      } else {
        const newWindow = window.open(url, "_blank", "noopener,noreferrer");
        // Fallback if popup was blocked
        if (!newWindow) {
          window.location.href = url;
        }
      }
    } finally {
      setOpeningPoker(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-primary tracking-widest">flair bar es 管理</span>
          {currentName && (
            <span className="text-[10px] text-muted-foreground mt-0.5">
              {currentName} {isMaster ? "(マスター)" : "(スタッフ)"}
            </span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground lg:hidden">
            <X size={18} />
          </button>
        )}
      </div>
      <Separator />
      <nav className="flex-1 overflow-y-auto py-2">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-2">
            <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            {group.items.map(({ href, icon: Icon, label }) => {
              const isActive = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}

        {/* External: Poker management system */}
        <div className="mb-2">
          <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            外部システム
          </p>
          <button
            onClick={handleOpenPoker}
            disabled={openingPoker}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors disabled:opacity-50"
          >
            <Spade size={16} />
            <span className="flex-1 text-left">ポーカー管理</span>
            <ExternalLink size={12} className="text-muted-foreground" />
          </button>
        </div>
      </nav>
      <Separator />
      <button
        onClick={handleLogout}
        className="flex items-center gap-2.5 px-4 py-4 text-sm text-destructive hover:bg-sidebar-accent transition-colors"
      >
        <LogOut size={16} />
        ログアウト
      </button>
    </div>
  );
}

export function AdminSidebar({ isMaster, currentName }: { isMaster: boolean; currentName: string | null }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex h-screen w-56 flex-shrink-0 flex-col border-r border-border">
        <SidebarContent isMaster={isMaster} currentName={currentName} />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 bg-sidebar border-b border-border">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors"
        >
          <Menu size={20} className="text-foreground" />
        </button>
        <span className="text-sm font-bold text-primary tracking-widest">flair bar es 管理</span>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 h-full shadow-2xl">
            <SidebarContent onClose={() => setMobileOpen(false)} isMaster={isMaster} currentName={currentName} />
          </div>
        </div>
      )}
    </>
  );
}
