import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MigrationRequestForm } from "@/components/customer/MigrationRequestForm";

export default async function MigrationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminClient = createAdminClient();
  const [{ data: me }, { data: requests }] = await Promise.all([
    adminClient.from("users").select("id, nickname").eq("id", user.id).single(),
    adminClient
      .from("legacy_migration_requests")
      .select("id, legacy_member_id, reported_chips, status, granted_chips, review_note, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const latest = requests?.[0] ?? null;
  const approved = requests?.find((r) => r.status === "approved") ?? null;
  const pending = requests?.find((r) => r.status === "pending") ?? null;

  return (
    <div className="px-4 py-6 space-y-4 animate-page-in">
      <Link href="/home" className="text-xs text-muted-foreground hover:underline">← ホーム</Link>
      <div>
        <h1 className="heading-gaming text-xl">旧アプリからの引き継ぎ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          以前のアプリの会員ID・お名前・チップ残高を送信してください。スタッフが確認のうえ、チップをこのアカウントに引き継ぎます。
        </p>
      </div>

      {approved ? (
        <div className="card-elevated rounded-2xl p-5 text-center space-y-1">
          <p className="text-sm font-bold">引き継ぎが完了しました</p>
          <p className="text-2xl font-black font-mono" style={{ color: "var(--chip)" }}>
            +{(approved.granted_chips ?? 0).toLocaleString()} chip
          </p>
          <p className="text-xs text-muted-foreground">旧会員ID {approved.legacy_member_id}</p>
        </div>
      ) : pending ? (
        <div className="card-elevated rounded-2xl p-5 text-center space-y-1">
          <p className="text-sm font-bold">確認中です</p>
          <p className="text-xs text-muted-foreground">
            旧会員ID {pending.legacy_member_id} / 申請チップ {pending.reported_chips.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">確認が終わるとLINEでお知らせします。</p>
        </div>
      ) : (
        <>
          {latest?.status === "rejected" && (
            <div className="rounded-2xl border border-destructive/40 p-4 text-sm space-y-1">
              <p className="font-bold text-destructive">前回の申請は確認できませんでした</p>
              {latest.review_note && <p className="text-muted-foreground">{latest.review_note}</p>}
              <p className="text-xs text-muted-foreground">内容を見直して再度申請してください。</p>
            </div>
          )}
          <MigrationRequestForm userId={me?.id ?? user.id} nickname={me?.nickname ?? ""} />
        </>
      )}
    </div>
  );
}
