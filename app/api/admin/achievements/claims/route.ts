import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin/auth";
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
    .select("id, user_id, achievement_id, proof_url, message, status, claimed_at, review_note, achievements(name, chip_reward), users(nickname)")
    .order("claimed_at", { ascending: false });

  return NextResponse.json(data ?? []);
}

// PATCH: 申請を承認/却下
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { claim_id, action, review_note } = await request.json().catch(() => ({}));
  if (!claim_id || !["approved","rejected"].includes(action)) {
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

  // 承認なら achievement grant API を内部呼び出し相当
  if (action === "approved") {
    const { data: ach } = await adminClient
      .from("achievements")
      .select("name, chip_reward")
      .eq("id", claim.achievement_id)
      .single();

    await adminClient.from("user_achievements").upsert({
      user_id:        claim.user_id,
      achievement_id: claim.achievement_id,
      granted_by:     user.id,
    }, { onConflict: "user_id,achievement_id" });

    if (ach && ach.chip_reward > 0) {
      await adminClient.from("chip_transactions").insert({
        type:        "achievement" as const,
        amount:      ach.chip_reward,
        to_user_id:  claim.user_id,
        from_user_id: null,
        memo:        `🏆 アチーブメント達成: ${ach.name}`,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
