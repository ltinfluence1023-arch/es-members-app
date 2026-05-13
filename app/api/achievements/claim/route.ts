import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const BUCKET   = "claim-proofs";
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData     = await request.formData();
  const achievementId = formData.get("achievement_id") as string | null;
  const message       = formData.get("message")       as string | null;
  const file          = formData.get("file")           as File   | null;

  if (!achievementId) return NextResponse.json({ error: "achievement_id が必要です" }, { status: 400 });

  const adminClient = createAdminClient();

  // user_claim タイプのみ申請可能
  const { data: ach } = await adminClient
    .from("achievements")
    .select("id, track_type, is_active")
    .eq("id", achievementId)
    .single();

  if (!ach?.is_active)              return NextResponse.json({ error: "このミッションは現在無効です" }, { status: 400 });
  if (ach.track_type !== "user_claim") return NextResponse.json({ error: "申請不要のミッションです" }, { status: 400 });

  // 画像アップロード（任意）
  let proofUrl: string | null = null;

  if (file && file.size > 0) {
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "5MB以内の画像を選択してください" }, { status: 400 });
    }

    // バケット作成（初回のみ）
    await adminClient.storage.createBucket(BUCKET, { public: true }).catch(() => {});

    const ext  = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${achievementId}_${Date.now()}.${ext}`;
    const buf  = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await adminClient.storage
      .from(BUCKET)
      .upload(path, buf, { upsert: true, contentType: file.type });

    if (uploadErr) return NextResponse.json({ error: "画像のアップロードに失敗しました" }, { status: 500 });

    const { data: { publicUrl } } = adminClient.storage.from(BUCKET).getPublicUrl(path);
    proofUrl = publicUrl;
  }

  // 申請レコードを作成（既存があれば更新）
  const { error } = await adminClient.from("achievement_claims").upsert({
    user_id:        user.id,
    achievement_id: achievementId,
    proof_url:      proofUrl,
    message:        message?.trim() || null,
    status:         "pending",
  }, { onConflict: "user_id,achievement_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
