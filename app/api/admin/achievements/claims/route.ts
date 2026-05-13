import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET: 申請一覧（pending 優先）
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("achievement_claims")
    .select("id, user_id, achievement_id, proof_url, message, status, claimed_at, review_note, achievements(name, chip_reward, track_type), users(nickname)")
    .order("status")                           // pending が先に来るよう文字順
    .order("claimed_at", { ascending: false });

  return NextResponse.json(data ?? []);
}

// PATCH: 申請を承認/却下
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { claim_id, action, review_note } = await request.json().catch(() => ({}));
  if (!claim_id || !["approved", "rejected"].includes(action)) {
    return NextResponse.json({ error: "パラメータ不足" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const { data: claim } = await adminClient
    .from("achievement_claims")
    .select("user_id, achievement_id, status")
    .eq("id", claim_id)
    .single();

  if (!claim) return NextResponse.json({ error: "申請が見つかりません" }, { status: 404 });
  if (claim.status !== "pending") return NextResponse.json({ error: "すでに処理済みです" }, { status: 409 });

  // ステータス更新
  await adminClient.from("achievement_claims").update({
    status:      action,
    reviewed_by: user.id,
    review_note: review_note ?? null,
    reviewed_at: new Date().toISOString(),
  }).eq("id", claim_id);

  // ミッション情報とユーザー情報を取得
  const [{ data: ach }, { data: targetUser }] = await Promise.all([
    adminClient.from("achievements").select("name, chip_reward").eq("id", claim.achievement_id).single(),
    adminClient.from("users").select("nickname").eq("id", claim.user_id).single(),
  ]);

  // 承認なら達成付与
  if (action === "approved") {
    await adminClient.from("user_achievements").upsert({
      user_id:        claim.user_id,
      achievement_id: claim.achievement_id,
      granted_by:     user.id,
    }, { onConflict: "user_id,achievement_id" });

    if (ach && ach.chip_reward > 0) {
      await adminClient.from("chip_transactions").insert({
        type:         "achievement" as const,
        amount:       ach.chip_reward,
        to_user_id:   claim.user_id,
        from_user_id: null,
        memo:         `🏆 アチーブメント達成: ${ach.name}`,
      });
    }
  }

  // 操作ログに記録
  await recordAudit({
    action:       action === "approved" ? "approve" : "reject",
    category:     "achievement",
    summary:      `アチーブメント申請を${action === "approved" ? "承認" : "却下"}: 「${ach?.name ?? "—"}」→ ${targetUser?.nickname ?? "—"} 様`,
    target_type:  "achievement_claim",
    target_id:    claim_id,
    target_label: ach?.name ?? claim_id,
    actor_id:     user.id,
    request,
  });

  return NextResponse.json({ ok: true });
}
