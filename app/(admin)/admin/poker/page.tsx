import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isMaster } from "@/lib/admin/auth";
import { getPokerState } from "@/lib/admin/poker";
import { PokerFloor } from "@/components/admin/poker/PokerFloor";

export const dynamic = "force-dynamic";

export default async function AdminPokerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin-login");

  const [tables, master] = await Promise.all([getPokerState(), isMaster(user.id)]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">ポーカー</h1>
        <p className="text-sm text-muted-foreground">
          空席をタップしてお客様のマイQRを読み取ると着席できます。着席中の席をタップするとチップ追加・退席ができます。
        </p>
      </div>
      <PokerFloor initialTables={tables} isMaster={master} />
    </div>
  );
}
