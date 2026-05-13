import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { ChipBalanceChart } from "@/components/customer/ChipBalanceChart";

const CHIP_LABELS: Record<string, string> = {
  checkin:  "チェックイン",
  transfer: "チップ送金",
  admin:    "手動付与",
  event:    "イベント",
  fee:      "送付手数料",
  seat_out: "ポーカー卓 退席",
  withdraw: "出金",
  purchase: "購入",
  coupon:   "クーポン",
};

const POINT_LABELS: Record<string, string> = {
  accounting_reward:  "会計報酬",
  accounting_payment: "会計支払",
  ranking_reward:     "ランキング報酬",
  coupon_exchange:    "クーポン交換",
  coupon_refund:      "クーポン返還",
  admin:              "手動付与",
  checkin:            "チェックイン",
};

function buildBalanceHistory(
  transactions: { amount: number; type: string; created_at: string; from_user_id: string | null; to_user_id: string | null }[],
  userId: string,
  currentBalance: number
) {
  const points: { date: string; balance: number }[] = [];
  let running = currentBalance;
  const now = new Date();
  const fmt = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;

  points.unshift({ date: fmt(now), balance: running });
  // Walk transactions backward (newest first → oldest), undoing each so we can plot before-states.
  for (const tx of transactions) {
    points.unshift({ date: fmt(new Date(tx.created_at)), balance: running });

    // Determine signed delta this tx applied to user's balance:
    let delta = 0;
    if (tx.type === "seat_out" && tx.from_user_id === userId) {
      delta = +tx.amount; // chips returned
    } else if (tx.type === "withdraw" && tx.from_user_id === userId) {
      delta = -tx.amount; // chips removed
    } else if (tx.to_user_id === userId) {
      delta = +tx.amount; // received
    } else if (tx.from_user_id === userId) {
      delta = -tx.amount; // sent / deducted
    }
    // Undo: balance before tx = balance after - delta = running - delta
    running -= delta;
  }
  const seen = new Map<string, number>();
  for (const p of points) seen.set(p.date, p.balance);
  return Array.from(seen.entries()).map(([date, balance]) => ({ date, balance }));
}

function fmtDate(s: string) {
  const d = new Date(s);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { tab } = await searchParams;
  const activeTab = tab === "point" ? "point" : "chip";

  const adminClient = createAdminClient();

  const [{ data: userData }, { data: chipTx }, { data: pointTx }] = await Promise.all([
    adminClient.from("users").select("chip_balance, point_balance").eq("id", user.id).single(),
    adminClient
      .from("chip_transactions")
      .select("id, amount, type, created_at, from_user_id, to_user_id, memo")
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(60),
    adminClient
      .from("point_transactions")
      .select("id, amount, type, created_at, memo")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  // Collect counterparty IDs for transfer transactions
  const counterpartyIds = new Set<string>();
  for (const tx of chipTx ?? []) {
    if (tx.type === "transfer") {
      if (tx.from_user_id && tx.from_user_id !== user.id) counterpartyIds.add(tx.from_user_id);
      if (tx.to_user_id && tx.to_user_id !== user.id) counterpartyIds.add(tx.to_user_id);
    }
  }
  const counterpartyIdList = Array.from(counterpartyIds);
  const nickMap: Record<string, string> = {};
  if (counterpartyIdList.length > 0) {
    const { data: nickData } = await adminClient
      .from("users")
      .select("id, nickname")
      .in("id", counterpartyIdList);
    for (const u of nickData ?? []) nickMap[u.id] = u.nickname;
  }

  const currentChip = userData?.chip_balance ?? 0;
  const chartData = buildBalanceHistory(chipTx ?? [], user.id, currentChip);

  return (
    <div className="px-4 py-5 space-y-4 animate-page-in">
      <h1 className="heading-gaming text-xl">History</h1>

      {/* Tab switcher */}
      <div className="flex rounded-xl overflow-hidden border-2 border-border">
        <a
          href="/history?tab=chip"
          className={`flex-1 py-3 text-[15px] font-black tracking-wide text-center transition-all ${activeTab === "chip" ? "" : "text-muted-foreground"}`}
          style={activeTab === "chip" ? {
            background: "var(--chip)",
            color: "#000",
            boxShadow: "inset 0 0 16px oklch(0.50 0.26 22 / 60%), 0 0 12px oklch(0.65 0.26 22 / 35%)",
          } : undefined}
        >
          🪙 チップ
        </a>
        <a
          href="/history?tab=point"
          className={`flex-1 py-3 text-[15px] font-black tracking-wide text-center transition-all ${activeTab === "point" ? "" : "text-muted-foreground"}`}
          style={activeTab === "point" ? {
            background: "var(--point)",
            color: "#000",
            boxShadow: "inset 0 0 16px oklch(0.55 0.22 355 / 60%), 0 0 12px oklch(0.72 0.22 355 / 35%)",
          } : undefined}
        >
          💎 ポイント
        </a>
      </div>

      {/* Chart */}
      {activeTab === "chip" && (
        <ChipBalanceChart data={chartData} currentBalance={currentChip} />
      )}

      {/* Chip transactions */}
      {activeTab === "chip" && (
        <div className="space-y-2.5">
          <p className="label-gaming px-0.5">取引明細</p>
          {!chipTx || chipTx.length === 0 ? (
            <div className="card-elevated rounded-xl p-6 text-center text-sm text-muted-foreground">履歴がありません</div>
          ) : (
            chipTx.map((tx) => {
              const isSend = tx.from_user_id === user.id && tx.type === "transfer";
              const isReceive = tx.to_user_id === user.id;

              // Counterparty name for transfers
              let subLabel: string | null = null;
              if (tx.type === "transfer") {
                if (isSend && tx.to_user_id) {
                  subLabel = `→ ${nickMap[tx.to_user_id] ?? "不明"}`;
                } else if (isReceive && tx.from_user_id) {
                  subLabel = `← ${nickMap[tx.from_user_id] ?? "不明"}`;
                }
              }

              // Determine effective sign per transaction type
              // seat_out (退席) = chips returned TO player → +
              // withdraw / fee / admin reduction = chips removed FROM player → -
              const isAdminDeduct = tx.type === "admin" && tx.from_user_id === user.id;
              const isFee = tx.type === "fee" && tx.from_user_id === user.id;
              const isWithdraw = tx.type === "withdraw" && tx.from_user_id === user.id;
              const isSeatOut = tx.type === "seat_out";

              let effectivePositive: boolean;
              if (isSeatOut) effectivePositive = true;
              else if (isSend || isAdminDeduct || isFee || isWithdraw) effectivePositive = false;
              else effectivePositive = isReceive;
              const effectiveSign = effectivePositive ? "+" : "-";

              return (
                <div key={tx.id} className="card-elevated rounded-xl px-4 py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold leading-tight truncate">
                      {CHIP_LABELS[tx.type] ?? tx.type}
                    </p>
                    {subLabel && (
                      <p className="text-[13px] text-muted-foreground mt-1 font-medium">{subLabel}</p>
                    )}
                    <p className="text-[12px] text-muted-foreground font-mono mt-1">{fmtDate(tx.created_at)}</p>
                  </div>
                  <p className="text-[20px] font-black font-mono tabular-nums flex-shrink-0"
                    style={{
                      color: effectivePositive ? "var(--chip)" : "var(--destructive)",
                      textShadow: effectivePositive
                        ? "0 0 12px oklch(0.65 0.26 22 / 50%)"
                        : "0 0 12px oklch(0.55 0.24 22 / 40%)",
                    }}>
                    {effectiveSign}{tx.amount.toLocaleString()}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Point transactions */}
      {activeTab === "point" && (
        <div className="space-y-2">
          {!pointTx || pointTx.length === 0 ? (
            <div className="card-elevated rounded-xl p-6 text-center text-sm text-muted-foreground">履歴がありません</div>
          ) : (
            pointTx.map((tx) => {
              const isNeg = tx.amount < 0;
              return (
                <div key={tx.id} className="card-elevated rounded-xl px-4 py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold leading-tight truncate">
                      {POINT_LABELS[tx.type] ?? tx.type}
                    </p>
                    {tx.memo && (
                      <p className="text-[13px] text-muted-foreground mt-1 font-medium truncate">{tx.memo}</p>
                    )}
                    <p className="text-[12px] text-muted-foreground font-mono mt-1">{fmtDate(tx.created_at)}</p>
                  </div>
                  <p className="text-[20px] font-black font-mono tabular-nums flex-shrink-0"
                    style={{
                      color: isNeg ? "var(--destructive)" : "var(--point)",
                      textShadow: isNeg
                        ? "0 0 12px oklch(0.55 0.24 22 / 40%)"
                        : "0 0 12px oklch(0.65 0.22 355 / 50%)",
                    }}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()}
                    <span className="text-[12px] ml-1 opacity-70 font-bold">PT</span>
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
