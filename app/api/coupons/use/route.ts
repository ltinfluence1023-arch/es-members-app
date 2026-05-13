import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ couponId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "入力が不正です" }, { status: 400 });

  const adminClient = createAdminClient();
  const { couponId } = parsed.data;

  // Verify the coupon belongs to this user and is not yet used/expired
  const { data: coupon } = await adminClient
    .from("coupons")
    .select("id, user_id, used_at, expires_at")
    .eq("id", couponId)
    .single();

  if (!coupon) return NextResponse.json({ error: "クーポンが見つかりません" }, { status: 404 });
  if (coupon.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (coupon.used_at) return NextResponse.json({ error: "このクーポンは既に使用済みです" }, { status: 400 });
  if (new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ error: "このクーポンは期限切れです" }, { status: 400 });
  }

  const { error } = await adminClient
    .from("coupons")
    .update({ used_at: new Date().toISOString() })
    .eq("id", couponId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
