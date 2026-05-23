import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/customer/BottomNav";
import { HamburgerMenu } from "@/components/customer/HamburgerMenu";
import { NoticeBell } from "@/components/customer/NoticeBell";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let noticeIds: string[] = [];
  if (user) {
    const adminClient = createAdminClient();

    // 誕生日未設定ならオンボーディングへ（LINE 初回登録フロー）
    const { data: profile } = await adminClient
      .from("users")
      .select("birthday")
      .eq("id", user.id)
      .single();
    if (!profile?.birthday) redirect("/onboarding");

    const { data } = await adminClient
      .from("notices")
      .select("id")
      .eq("is_published", true)
      .order("created_at", { ascending: false });
    noticeIds = (data ?? []).map((n) => n.id);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-5 py-3 backdrop-blur-md border-b"
        style={{
          background: "linear-gradient(180deg, oklch(0.09 0.014 22 / 92%) 0%, oklch(0.07 0.010 22 / 90%) 100%)",
          borderBottomColor: "oklch(0.63 0.26 22 / 28%)",
          boxShadow: "0 1px 0 oklch(0.63 0.26 22 / 12%), 0 4px 20px rgba(0,0,0,0.25)",
        }}
      >
        <span
          className="text-base font-black tracking-[0.12em] lowercase"
          style={{
            background: "linear-gradient(135deg, oklch(0.72 0.26 22) 0%, oklch(0.58 0.24 22) 60%, oklch(0.65 0.20 355) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 8px oklch(0.65 0.26 22 / 40%))",
          }}
        >
          flair bar es
        </span>
        <div className="flex items-center gap-1">
          <NoticeBell noticeIds={noticeIds} />
          <HamburgerMenu />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-24 overflow-y-auto">
        <div className="mx-auto max-w-md w-full">
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
