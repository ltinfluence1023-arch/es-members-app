import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function RankPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminClient = createAdminClient();

  const [{ data: userData }, { data: ranks }, visitCountResult] = await Promise.all([
    adminClient
      .from("users")
      .select("nickname, rank_id, ranks(name, required_visit_count, checkin_bonus)")
      .eq("id", user.id)
      .single(),
    adminClient
      .from("ranks")
      .select("id, name, required_visit_count, checkin_bonus, display_order")
      .order("display_order", { ascending: true }),
    adminClient
      .from("visits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  type UserData = {
    nickname: string;
    rank_id: string | null;
    ranks: { name: string; required_visit_count: number; checkin_bonus: number } | null;
  };
  const typedUser = userData as UserData | null;
  const currentVisits = visitCountResult.count ?? 0;

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/home" className="text-xs text-muted-foreground hover:underline">← ホーム</Link>
        <h1 className="text-lg font-semibold">ランク</h1>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-1.5">
        <p className="text-xs text-muted-foreground">現在のランク</p>
        <p className="text-2xl font-bold">🏅 {typedUser?.ranks?.name ?? "-"}</p>
        <p className="text-xs text-muted-foreground">
          累計来店数: <span className="text-foreground font-medium">{currentVisits} 回</span>
        </p>
        <p className="text-xs text-muted-foreground">
          チェックインボーナス: <span className="text-foreground font-medium" style={{ color: "var(--chip)" }}>
            {typedUser?.ranks?.checkin_bonus ?? 500} チップ
          </span>
        </p>
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground">ランク一覧</h2>
      <div className="space-y-2">
        {(ranks ?? []).map((rank) => {
          const isCurrent = rank.id === typedUser?.rank_id;
          return (
            <div
              key={rank.id}
              className={`rounded-xl border p-4 space-y-1 ${
                isCurrent ? "border-primary bg-primary/10" : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">{rank.name}</p>
                {isCurrent && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    現在
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                必要来店数: <span className="text-foreground">{rank.required_visit_count} 回</span>
              </p>
              <p className="text-xs text-muted-foreground">
                チェックインボーナス: <span className="text-foreground">{rank.checkin_bonus} チップ</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
