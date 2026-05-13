"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, User, Coins, Star, FileText, Shield, LogOut, ChevronRight, Gem, HelpCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

const menuItems = [
  { href: "/quiz",          icon: HelpCircle, label: "デイリークイズ" },
  { href: "/menu/profile",  icon: User,       label: "プロフィール" },
  { href: "/history?tab=chip",  icon: Coins,  label: "チップ履歴" },
  { href: "/history?tab=point", icon: Gem,    label: "ポイント履歴" },
  { href: "/menu/rank",     icon: Star,       label: "ランク詳細" },
];

const legalItems = [
  { href: "/menu/terms", icon: FileText, label: "サービス利用規約" },
  { href: "/menu/privacy", icon: Shield, label: "個人情報保護方針" },
];

export function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="メニューを開く"
        className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <Menu size={22} />
      </SheetTrigger>
      <SheetContent side="right" className="w-72 bg-card border-border p-0">
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="text-left text-foreground">メニュー</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col">
          {menuItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-6 py-3.5 text-foreground hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className="text-muted-foreground" />
                <span className="text-sm">{label}</span>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </Link>
          ))}

          <Separator className="my-2" />

          {legalItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-6 py-3.5 text-foreground hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className="text-muted-foreground" />
                <span className="text-sm">{label}</span>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </Link>
          ))}

          <Separator className="my-2" />

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-6 py-3.5 text-destructive hover:bg-secondary transition-colors w-full"
          >
            <LogOut size={18} />
            <span className="text-sm">ログアウト</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
