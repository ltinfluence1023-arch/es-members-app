import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";

const TYPE_LABELS: Record<string, string> = {
  grant: "付与",
  coupon_exchange: "クーポン交換",
  coupon_refund: "クーポン返還",
  admin: "管理者操作",
};

export default async function PointHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminClient = createAdminClient();

  const { data: txList } = await adminClient
    .from("point_transactions")
    .select("id, amount, type, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/home" className="text-xs text-muted-foreground hover:underline">← ホーム</Link>
        <h1 className="text-lg font-semibold">ポイント履歴</h1>
      </div>

      {!txList || txList.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">履歴がありません</p>
      ) : (
        <div className="space-y-2">
          {txList.map((tx) => {
            const isNeg = tx.amount < 0;
            return (
              <div key={tx.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{TYPE_LABELS[tx.type] ?? tx.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleString("ja-JP")}
                  </p>
                </div>
                <p
                  className={`text-base font-bold font-mono ${isNeg ? "text-destructive" : ""}`}
                  style={isNeg ? undefined : { color: "var(--point)" }}
                >
                  {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()}pt
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
