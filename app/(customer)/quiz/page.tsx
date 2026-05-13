import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DailyQuizClient } from "@/components/customer/DailyQuizClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function QuizPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="px-4 py-4 animate-page-in">
      <div className="space-y-1 mb-6">
        <p className="label-gaming">daily quiz</p>
        <p className="text-xs text-muted-foreground">毎日1問出題。正解で 10チップ獲得！</p>
      </div>
      <DailyQuizClient />
    </div>
  );
}
