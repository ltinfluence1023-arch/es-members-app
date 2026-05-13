import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminChipOp } from "@/components/admin/AdminChipOp";
import { AdminPointOp } from "@/components/admin/AdminPointOp";
import { CustomerDeleteButton } from "@/components/admin/CustomerDeleteButton";
import { AdminAchievementGrant } from "@/components/admin/AdminAchievementGrant";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const adminClient = createAdminClient();

  // Determine current operator's role
  const supabase = await createClient();
  const { data: { user: me } } = await supabase.auth.getUser();
  const { data: currentAdmin } = me
    ? await adminClient.from("admin_users").select("role").eq("id", me.id).single()
    : { data: null };
  const isMaster = currentAdmin?.role === "admin";

  const { data: user } = await adminClient
    .from("users")
    .select("id, nickname, email_or_phone, chip_balance, point_balance, ranks(name), created_at, birthday, gender, total_visit_count, last_visit_at")
    .eq("id", id)
    .single();

  if (!user) notFound();

  type UserRow = {
    id: string;
    nickname: string;
    email_or_phone: string;
    chip_balance: number;
    point_balance: number;
    ranks: { name: string } | null;
    created_at: string;
    birthday: string | null;
    gender: "male" | "female" | "other" | null;
    total_visit_count: number;
    last_visit_at: string | null;
  };
  const typedUser = user as UserRow;

  const genderLabel = typedUser.gender === "male" ? "男性" : typedUser.gender === "female" ? "女性" : typedUser.gender === "other" ? "その他" : "—";

  function calcAge(bd: string | null): number | null {
    if (!bd) return null;
    const birth = new Date(bd);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }
  const age = calcAge(typedUser.birthday);

  const { data: chipTx } = await adminClient
    .from("chip_transactions")
    .select("id, amount, type, memo, from_user_id, to_user_id, created_by, created_at")
    .or(`from_user_id.eq.${id},to_user_id.eq.${id}`)
    .order("created_at", { ascending: false })
    .limit(20);

  // Resolve counterparty nicknames + admin operator names
  const counterpartyIds = new Set<string>();
  const adminOpIds = new Set<string>();
  for (const t of chipTx ?? []) {
    if (t.type === "transfer") {
      if (t.from_user_id && t.from_user_id !== id) counterpartyIds.add(t.from_user_id);
      if (t.to_user_id && t.to_user_id !== id) counterpartyIds.add(t.to_user_id);
    }
    if (t.created_by) adminOpIds.add(t.created_by);
  }
  const nickMap: Record<string, string> = {};
  if (counterpartyIds.size > 0) {
    const { data: nickData } = await adminClient
      .from("users").select("id, nickname").in("id", [...counterpartyIds]);
    for (const u of nickData ?? []) nickMap[u.id] = u.nickname;
  }
  const adminOpMap: Record<string, string> = {};
  if (adminOpIds.size > 0) {
    const { data: aData } = await adminClient
      .from("admin_users").select("id, name").in("id", [...adminOpIds]);
    for (const a of aData ?? []) adminOpMap[a.id] = a.name;
  }

  const TYPE_LABELS: Record<string, string> = {
    checkin: "チェックイン",
    transfer: "送付",
    admin: "管理操作",
    purchase: "購入",
    coupon: "クーポン",
    fee: "手数料",
    seat_out: "ポーカー退席",
    withdraw: "出金",
  };

  const { data: pointTx } = await adminClient
    .from("point_transactions")
    .select("id, amount, type, created_by, memo, created_at")
    .eq("user_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/admin/customers" className="text-xs text-muted-foreground hover:underline">← 顧客一覧</Link>
          <h1 className="text-xl font-semibold">{typedUser.nickname}</h1>
        </div>
        {isMaster && <CustomerDeleteButton userId={typedUser.id} nickname={typedUser.nickname} />}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">🪙 チップ残高</p>
          <p className="text-2xl font-bold" style={{ color: "var(--chip)" }}>
            {typedUser.chip_balance.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">💎 ポイント残高</p>
          <p className="text-2xl font-bold" style={{ color: "var(--point)" }}>
            {typedUser.point_balance.toLocaleString()}pt
          </p>
        </div>
      </div>

      {/* Profile info */}
      <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground mb-1">ランク</p>
          <p className="font-medium">{typedUser.ranks?.name ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">来店回数</p>
          <p className="font-medium" style={{ color: "var(--primary)" }}>
            {typedUser.total_visit_count}<span className="text-xs ml-1 text-muted-foreground font-normal">回</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">最終来店</p>
          <p className="font-medium text-xs">
            {typedUser.last_visit_at ? new Date(typedUser.last_visit_at).toLocaleDateString("ja-JP") : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">生年月日</p>
          <p className="font-medium text-xs">
            {typedUser.birthday
              ? `${new Date(typedUser.birthday).toLocaleDateString("ja-JP")}${age !== null ? ` (${age}歳)` : ""}`
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">性別</p>
          <p className="font-medium">{genderLabel}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">登録日</p>
          <p className="font-medium text-xs">{new Date(typedUser.created_at).toLocaleDateString("ja-JP")}</p>
        </div>
        <div className="col-span-2 sm:col-span-3">
          <p className="text-xs text-muted-foreground mb-1">メール</p>
          <p className="font-medium text-xs font-mono break-all">{typedUser.email_or_phone}</p>
        </div>
      </div>

      {/* Admin operations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AdminChipOp userId={id} />
        {isMaster ? (
          <AdminPointOp userId={id} />
        ) : (
          <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-center text-xs text-muted-foreground">
            💎 ポイント操作はマスター権限のみ
          </div>
        )}
      </div>

      {/* アチーブメント付与 */}
      <div className="rounded-xl border border-border bg-card p-4">
        <AdminAchievementGrant userId={typedUser.id} />
      </div>

      {/* Chip history */}
      <div>
        <h2 className="text-sm font-semibold mb-2">チップ履歴（直近20件）</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="py-2 px-3 text-left text-muted-foreground font-medium">種別</th>
                <th className="py-2 px-3 text-left text-muted-foreground font-medium">詳細</th>
                <th className="py-2 px-3 text-right text-muted-foreground font-medium">金額</th>
                <th className="py-2 px-3 text-left text-muted-foreground font-medium">担当者</th>
                <th className="py-2 px-3 text-left text-muted-foreground font-medium">日時</th>
              </tr>
            </thead>
            <tbody>
              {(chipTx ?? []).map((tx) => {
                const isIncoming = tx.to_user_id === id;
                const isOutgoing = tx.from_user_id === id;

                // Determine sign by type semantics:
                // - seat_out: chips returned to player → +
                // - withdraw / fee: chips removed → -
                // - transfer / admin / others: by direction
                let positive: boolean;
                if (tx.type === "seat_out") positive = true;
                else if (tx.type === "withdraw" || tx.type === "fee") positive = false;
                else positive = isIncoming;

                const sign = positive ? "+" : "-";
                const color = positive ? "var(--chip)" : "var(--destructive)";

                let detail: string = "—";
                if (tx.type === "transfer") {
                  if (isOutgoing && tx.to_user_id) {
                    detail = `→ ${nickMap[tx.to_user_id] ?? "不明"}`;
                  } else if (isIncoming && tx.from_user_id) {
                    detail = `← ${nickMap[tx.from_user_id] ?? "不明"}`;
                  }
                } else if (tx.type === "admin") {
                  detail = isIncoming ? "管理者付与" : "管理者減算";
                  if (tx.memo) detail += `（${tx.memo}）`;
                } else if (tx.type === "fee") {
                  detail = "送付手数料 10%";
                } else if (tx.type === "seat_out") {
                  detail = tx.memo ?? "ポーカー卓退席";
                } else if (tx.type === "withdraw") {
                  detail = tx.memo ?? "出金";
                } else if (tx.memo) {
                  detail = tx.memo;
                }

                return (
                  <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-muted/40 text-[10px] font-bold whitespace-nowrap">
                        {TYPE_LABELS[tx.type] ?? tx.type}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">{detail}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold whitespace-nowrap" style={{ color }}>
                      {sign}{tx.amount.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {tx.created_by ? (
                        <span className="text-foreground font-medium">{adminOpMap[tx.created_by] ?? "—"}</span>
                      ) : (
                        <span className="text-muted-foreground">システム</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                );
              })}
              {(chipTx ?? []).length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">履歴がありません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Point history */}
      <div>
        <h2 className="text-sm font-semibold mb-2">ポイント履歴（直近20件）</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="py-2 px-3 text-left text-muted-foreground font-medium">種別</th>
                <th className="py-2 px-3 text-left text-muted-foreground font-medium">メモ</th>
                <th className="py-2 px-3 text-right text-muted-foreground font-medium">金額</th>
                <th className="py-2 px-3 text-left text-muted-foreground font-medium">担当者</th>
                <th className="py-2 px-3 text-left text-muted-foreground font-medium">日時</th>
              </tr>
            </thead>
            <tbody>
              {(pointTx ?? []).map((tx) => (
                <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="py-2 px-3">
                    <span className="px-1.5 py-0.5 rounded bg-muted/40 text-[10px] font-bold whitespace-nowrap">
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">{tx.memo ?? "—"}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold whitespace-nowrap"
                    style={{ color: tx.amount < 0 ? "var(--destructive)" : "var(--point)" }}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    {tx.created_by ? (
                      <span className="text-foreground font-medium">{adminOpMap[tx.created_by] ?? "—"}</span>
                    ) : (
                      <span className="text-muted-foreground">システム</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                    {new Date(tx.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
              {(pointTx ?? []).length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">履歴がありません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
