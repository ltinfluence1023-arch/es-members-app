import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "トークンが必要です" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const { data: qrToken } = await adminClient
    .from("qr_tokens")
    .select("user_id, expires_at, used_at")
    .eq("token", token)
    .eq("purpose", "user_receive")
    .single();

  if (!qrToken) {
    return NextResponse.json({ error: "QRコードが無効です" }, { status: 400 });
  }
  if (qrToken.used_at) {
    return NextResponse.json({ error: "このQRコードは使用済みです" }, { status: 400 });
  }
  if (new Date(qrToken.expires_at) < new Date()) {
    return NextResponse.json({ error: "QRコードの有効期限が切れています" }, { status: 400 });
  }
  if (user.id === qrToken.user_id) {
    return NextResponse.json({ error: "自分自身へは送金できません" }, { status: 400 });
  }

  const [{ data: receiver }, { data: sender }] = await Promise.all([
    adminClient.from("users").select("nickname").eq("id", qrToken.user_id).single(),
    adminClient.from("users").select("chip_balance").eq("id", user.id).single(),
  ]);

  return NextResponse.json({
    toNickname: receiver?.nickname ?? "相手",
    senderBalance: sender?.chip_balance ?? 0,
  });
}
