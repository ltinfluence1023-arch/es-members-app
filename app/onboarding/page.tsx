import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/customer/OnboardingForm";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await createAdminClient()
    .from("users")
    .select("nickname, avatar_url, birthday")
    .eq("id", user.id)
    .single();

  // 誕生日が既に設定済みならホームへ
  if (profile?.birthday) redirect("/home");

  return (
    <OnboardingForm
      nickname={profile?.nickname ?? ""}
      avatarUrl={profile?.avatar_url ?? null}
    />
  );
}
