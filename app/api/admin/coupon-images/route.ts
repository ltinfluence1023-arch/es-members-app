import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const BUCKET = "coupon-images";
const MAX_BYTES = 4 * 1024 * 1024;

async function isAdmin(userId: string) {
  const { data } = await createAdminClient()
    .from("admin_users").select("id").eq("id", userId).single();
  return !!data;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "ファイルがありません" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "4MB以内の画像を選択してください" }, { status: 400 });

  const adminClient = createAdminClient();
  await adminClient.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "png";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await adminClient.storage
    .from(BUCKET)
    .upload(path, buffer, { upsert: false, contentType: file.type });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = adminClient.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: publicUrl });
}
