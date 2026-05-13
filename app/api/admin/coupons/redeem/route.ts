import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ couponId: z.string().uuid() });

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await createAdminClient()
    .from("admin_users").select("id").eq("id", userId).single();
  return !!data;
}

// R-601〜R-603: クーポン使用
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "入力が不正です" }, { status: 400 });

  const { couponId } = parsed.data;
  const adminClient = createAdminClient();

  const { data: coupon } = await adminClient
    .from("coupons")
    .select("id, used_at, expires_at, user_id, template_id")
    .eq("id", couponId)
    .single();

  if (!coupon) return NextResponse.json({ error: "クーポンが見つかりません" }, { status: 404 });
  if (coupon.used_at) return NextResponse.json({ error: "このクーポンは使用済みです" }, { status: 400 });
  if (new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ error: "クーポンの有効期限が切れています" }, { status: 400 });
  }

  const { data: templateData } = await adminClient
    .from("coupon_templates")
    .select("name")
    .eq("id", coupon.template_id)
    .single();

  const { error } = await adminClient
    .from("coupons")
    .update({ used_at: new Date().toISOString(), used_by: user.id })
    .eq("id", couponId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const templateName = templateData?.name ?? "クーポン";
  return NextResponse.json({ success: true, templateName });
}
