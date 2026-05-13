import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const BUCKET = "avatars";
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "ファイルがありません" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "2MB以内の画像を選択してください" }, { status: 400 });

  const adminClient = createAdminClient();

  // バケットがなければ作成（パブリック）
  await adminClient.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await adminClient.storage
    .from(BUCKET)
    .upload(user.id, buffer, { upsert: true, contentType: file.type });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Cache-bust query param so consumers see the new image even if URL is the same
  const { data: { publicUrl } } = adminClient.storage.from(BUCKET).getPublicUrl(user.id);
  const urlWithVersion = `${publicUrl}?v=${Date.now()}`;

  // Persist URL to users.avatar_url so external systems (e.g. poker dealer app)
  // can reference it directly via DB query.
  await adminClient
    .from("users")
    .update({ avatar_url: urlWithVersion })
    .eq("id", user.id);

  return NextResponse.json({ url: urlWithVersion });
}
