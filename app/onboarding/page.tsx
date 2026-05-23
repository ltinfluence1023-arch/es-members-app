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

  // profile が null（public.users INSERT 失敗など）でも表示できるよう
  // auth.users の user_metadata からフォールバック
  const nickname  = profile?.nickname
    ?? (user.user_metadata?.line_display_name as string | undefined)
    ?? "";
  const avatarUrl = profile?.avatar_url ?? null;

  return <OnboardingForm nickname={nickname} avatarUrl={avatarUrl} />;
}
