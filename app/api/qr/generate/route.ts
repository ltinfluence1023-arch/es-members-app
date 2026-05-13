import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

// R-801: マイQRトークンは UUID v4 で生成
// R-802: 有効期限は5分
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // 既存の未使用トークンを無効化
  await adminClient
    .from("qr_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("purpose", "user_receive")
    .is("used_at", null);

  const { error } = await adminClient.from("qr_tokens").insert({
    user_id: user.id,
    token,
    purpose: "user_receive",
    expires_at: expiresAt,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const payload = JSON.stringify({ type: "user_receive", token });
  return NextResponse.json({ token, payload, expiresAt });
}
