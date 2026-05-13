import { RankingsClient } from "@/components/admin/RankingsClient";

export const dynamic = "force-dynamic";

export default function AdminRankingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">ランキング履歴</h1>
        <p className="text-sm text-muted-foreground mt-0.5">日次・月次・年次のチップ増減＆来店ランキング</p>
      </div>
      <RankingsClient />
    </div>
  );
}
