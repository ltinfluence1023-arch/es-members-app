import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const adminClient = createAdminClient();

  const { data: notice } = await adminClient
    .from("notices")
    .select("id, title, body, created_at, is_published")
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (!notice) notFound();

  const d = new Date(notice.created_at);
  const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;

  return (
    <div className="px-4 py-4 space-y-3 animate-page-in">

      {/* Back nav */}
      <Link
        href="/notices"
        className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors interactive"
      >
        <ChevronLeft size={12} />
        お知らせ一覧
      </Link>

      {/* Notice content */}
      <div className="card-elevated rounded-2xl overflow-hidden">
        {/* Title block */}
        <div className="px-4 pt-4 pb-3 border-b border-border">
          <div
            className="inline-block text-[7px] font-black tracking-[0.2em] uppercase px-1.5 py-0.5 rounded-sm mb-2"
            style={{ background: "var(--primary)", color: "#fff" }}
          >
            お知らせ
          </div>
          <h1 className="text-[15px] font-bold leading-snug">{notice.title}</h1>
          <p className="text-[10px] text-muted-foreground font-mono mt-1">{dateStr}</p>
        </div>

        {/* Body */}
        <div className="px-4 py-4">
          <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
            {notice.body}
          </p>
        </div>
      </div>

    </div>
  );
}
