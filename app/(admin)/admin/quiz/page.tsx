import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { QuizManager } from "@/components/admin/QuizManager";

export const dynamic = "force-dynamic";

export default async function AdminQuizPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) redirect("/admin-login");

  const adminClient = createAdminClient();
  const { data: questions } = await adminClient
    .from("quiz_questions")
    .select("id, question, option_a, option_b, option_c, option_d, correct_option, is_active, created_at")
    .order("created_at", { ascending: false });

  return <QuizManager initialQuestions={questions ?? []} />;
}
