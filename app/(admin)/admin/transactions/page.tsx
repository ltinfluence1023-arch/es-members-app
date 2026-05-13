import { TransactionsClient } from "@/components/admin/TransactionsClient";

export const dynamic = "force-dynamic";

export default function AdminTransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">取引履歴</h1>
        <p className="text-sm text-muted-foreground mt-0.5">日付ごとのチップ・ポイント取引（JST）</p>
      </div>
      <TransactionsClient />
    </div>
  );
}
