import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

function isNew(dateStr: string) {
  return Date.now() - new Date(dateStr).getTime() < 7 * 24 * 60 * 60 * 1000;
}

export default async function NoticesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminClient = createAdminClient();
  const { data: notices } = await adminClient
    .from("notices")
    .select("id, title, created_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  return (
    <div className="px-4 py-4 space-y-3 animate-page-in">

      <h1 className="heading-gaming text-xl">Notices</h1>

      {!notices || notices.length === 0 ? (
        <div className="card-elevated rounded-xl p-10 text-center text-xs text-muted-foreground">
          お知らせはありません
        </div>
      ) : (
        <div className="space-y-1.5">
          {notices.map((n) => {
            const fresh = isNew(n.created_at);
            const d = new Date(n.created_at);
            const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;

            return (
              <Link key={n.id} href={`/notices/${n.id}`} className="block interactive">
                <div className="card-elevated rounded-xl px-4 py-3.5 flex items-center gap-3">
                  {/* Accent bar */}
                  <div
                    className="flex-shrink-0 w-1.5 h-10 rounded-full"
                    style={{
                      background: fresh ? "var(--primary)" : "oklch(1 0 0 / 14%)",
                      boxShadow: fresh ? "0 0 8px oklch(0.65 0.26 22 / 60%)" : undefined,
                    }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {fresh && (
                        <span
                          className="flex-shrink-0 text-[10px] font-black tracking-[0.22em] uppercase px-1.5 py-0.5 rounded-sm"
                          style={{
                            background: "var(--primary)",
                            color: "#fff",
                            boxShadow: "0 0 10px oklch(0.65 0.26 22 / 50%)",
                          }}
                        >
                          NEW
                        </span>
                      )}
                      <p className="text-[15px] font-bold truncate leading-tight">{n.title}</p>
                    </div>
                    <p className="text-[12px] text-muted-foreground font-mono">{dateStr}</p>
                  </div>

                  <ChevronRight size={18} style={{ color: "var(--primary)" }} className="flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
