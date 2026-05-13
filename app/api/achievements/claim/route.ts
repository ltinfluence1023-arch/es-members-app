import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { achievement_id, proof_url, message } = await request.json().catch(() => ({}));
  if (!achievement_id) return NextResponse.json({ error: "achievement_id が必要です" }, { status: 400 });

  const adminClient = createAdminClient();

  // user_claim タイプのみ申請可能
  const { data: ach } = await adminClient
    .from("achievements")
    .select("id, track_type, is_active")
    .eq("id", achievement_id)
    .single();

  if (!ach?.is_active) return NextResponse.json({ error: "このミッションは現在無効です" }, { status: 400 });
  if (ach.track_type !== "user_claim") return NextResponse.json({ error: "申請不要のミッションです" }, { status: 400 });

  const { error } = await adminClient.from("achievement_claims").upsert({
    user_id: user.id,
    achievement_id,
    proof_url: proof_url ?? null,
    message:   message ?? null,
    status:    "pending",
  }, { onConflict: "user_id,achievement_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
