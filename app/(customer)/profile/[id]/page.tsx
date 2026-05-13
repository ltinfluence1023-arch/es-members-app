import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AvatarImage } from "@/components/customer/AvatarImage";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const adminClient = createAdminClient();

  const [{ data: profile }, { data: authUserData }] = await Promise.all([
    adminClient
      .from("users")
      .select("id, nickname, chip_balance, point_balance, total_visit_count, rank_id, created_at")
      .eq("id", id)
      .single(),
    adminClient.auth.admin.getUserById(id),
  ]);

  if (!profile) notFound();

  const bio = (authUserData?.user?.user_metadata?.bio as string | undefined) ?? "";

  const { data: rank } = profile.rank_id
    ? await adminClient.from("ranks").select("name").eq("id", profile.rank_id).single()
    : { data: null };

  const isSelf = user.id === id;
  const joined = new Date(profile.created_at);
  const joinedStr = `${joined.getFullYear()}.${String(joined.getMonth() + 1).padStart(2, "0")}.${String(joined.getDate()).padStart(2, "0")}`;

  return (
    <div className="px-4 py-5 space-y-4 animate-page-in">

      <div className="flex items-center gap-2">
        <Link
          href="/ranking"
          className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors interactive"
        >
          <ChevronLeft size={14} />
          ランキング
        </Link>
        {isSelf && (
          <Link
            href="/menu/profile"
            className="ml-auto text-[11px] font-bold interactive"
            style={{ color: "var(--primary)" }}
          >
            編集
          </Link>
        )}
      </div>

      {/* Profile card */}
      <div className="card-elevated rounded-2xl overflow-hidden">
        <div className="h-20" style={{ background: "linear-gradient(135deg, oklch(0.25 0.06 22), oklch(0.18 0.03 22))" }} />
        <div className="px-5 pb-5 -mt-10 flex flex-col items-center text-center">
          <div className="ring-4 ring-card rounded-full mb-3">
            <AvatarImage userId={profile.id} nickname={profile.nickname} size={80} />
          </div>
          <h1 className="text-xl font-black">{profile.nickname}</h1>
          {rank && (
            <span
              className="mt-1.5 inline-block text-[10px] font-black tracking-[0.2em] uppercase px-2.5 py-0.5 rounded-full"
              style={{ background: "var(--primary)", color: "#fff" }}
            >
              {rank.name}
            </span>
          )}
          <p className="text-[11px] text-muted-foreground font-mono mt-1.5">{joinedStr} 入会</p>
          {isSelf && (
            <p className="text-[10px] font-bold tracking-widest uppercase mt-1" style={{ color: "var(--primary)" }}>
              あなたのプロフィール
            </p>
          )}

          {/* Bio */}
          {bio && (
            <p className="mt-3 text-sm text-foreground/80 leading-relaxed max-w-xs whitespace-pre-wrap">
              {bio}
            </p>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Chip",  value: profile.chip_balance.toLocaleString(),        sub: "保有チップ" },
          { label: "PT",    value: profile.point_balance.toLocaleString(),        sub: "保有ポイント" },
          { label: "Visit", value: profile.total_visit_count.toLocaleString(),    sub: "来店回数" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="card-elevated rounded-2xl p-4 text-center">
            <p className="text-[9px] font-black tracking-[0.2em] uppercase text-muted-foreground mb-1">{label}</p>
            <p className="text-xl font-black text-white/90 tabular-nums">{value}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground font-mono text-center tracking-wider">
        ID: {profile.id.slice(0, 8).toUpperCase()}
      </p>
    </div>
  );
}
