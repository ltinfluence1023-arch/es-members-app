import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { NextRequest, NextResponse } from "next/server";

// POST: スタッフがユーザーにアチーブメントを付与
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { user_id, achievement_id, note } = await request.json().catch(() => ({}));
  if (!user_id || !achievement_id) return NextResponse.json({ error: "パラメータ不足" }, { status: 400 });

  const adminClient = createAdminClient();

  // ミッション情報取得
  const { data: ach } = await adminClient
    .from("achievements")
    .select("id, name, chip_reward, track_type, is_active")
    .eq("id", achievement_id)
    .single();

  if (!ach?.is_active) return NextResponse.json({ error: "無効なミッションです" }, { status: 400 });
  if (ach.track_type === "auto") return NextResponse.json({ error: "自動ミッションは手動付与できません" }, { status: 400 });

  // 既達成チェック
  const { data: existing } = await adminClient
    .from("user_achievements")
    .select("id")
    .eq("user_id", user_id)
    .eq("achievement_id", achievement_id)
    .single();

  if (existing) return NextResponse.json({ error: "すでに達成済みです" }, { status: 409 });

  // 付与
  const { error } = await adminClient.from("user_achievements").insert({
    user_id,
    achievement_id,
    granted_by: user.id,
    note: note ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // チップ付与
  if (ach.chip_reward > 0) {
    await adminClient.from("chip_transactions").insert({
      type:        "achievement" as const,
      amount:      ach.chip_reward,
      to_user_id:  user_id,
      from_user_id: null,
      memo:        `🏆 アチーブメント達成: ${ach.name}`,
    });
  }

  // 申請があれば承認済みにする
  await adminClient
    .from("achievement_claims")
    .update({ status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("user_id", user_id)
    .eq("achievement_id", achievement_id);

  await recordAudit({
    action: "grant", category: "other",
    summary: `アチーブメント付与: ${ach.name} → ユーザー ${user_id.slice(0,8)}`,
    target_type: "achievement", target_id: achievement_id, target_label: ach.name,
    actor_id: user.id, request,
  });

  return NextResponse.json({ ok: true, chipRewarded: ach.chip_reward });
}
