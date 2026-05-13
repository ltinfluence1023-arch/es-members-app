import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RankingClient } from "@/components/customer/RankingClient";

export default async function RankingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <Suspense fallback={<div className="px-4 py-10 text-center text-sm text-muted-foreground">読み込み中...</div>}>
      <RankingClient myId={user.id} />
    </Suspense>
  );
}
