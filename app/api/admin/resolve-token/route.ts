import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ token: z.string().uuid() });

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await createAdminClient()
    .from("admin_users").select("id").eq("id", userId).single();
  return !!data;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "不正なトークン形式" }, { status: 400 });

  const { data: qrToken } = await createAdminClient()
    .from("qr_tokens")
    .select("user_id, expires_at, used_at")
    .eq("token", parsed.data.token)
    .eq("purpose", "user_receive")
    .single();

  if (!qrToken) return NextResponse.json({ error: "QRコードが見つかりません" }, { status: 404 });
  if (new Date(qrToken.expires_at) < new Date()) {
    return NextResponse.json({ error: "QRコードの有効期限が切れています" }, { status: 400 });
  }

  return NextResponse.json({ userId: qrToken.user_id });
}
