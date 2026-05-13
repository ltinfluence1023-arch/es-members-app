import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ templateId: z.string().uuid() });

// R-401〜R-406: ポイント交換クーポン
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "入力が不正です" }, { status: 400 });

  const { templateId } = parsed.data;
  const adminClient = createAdminClient();

  // テンプレート取得
  const { data: template } = await adminClient
    .from("coupon_templates")
    .select("id, point_cost, valid_days, is_active, max_issuance")
    .eq("id", templateId)
    .single();

  if (!template || !template.is_active) {
    return NextResponse.json({ error: "クーポンが存在しないか無効です" }, { status: 400 });
  }
  if (!template.point_cost) {
    return NextResponse.json({ error: "このクーポンはポイント交換対象外です" }, { status: 400 });
  }

  // 残高確認
  const { data: userData } = await adminClient
    .from("users")
    .select("point_balance")
    .eq("id", user.id)
    .single();

  if (!userData || userData.point_balance < template.point_cost) {
    return NextResponse.json({ error: "ポイントが不足しています" }, { status: 400 }); // R-402
  }

  // 発行上限チェック
  if (template.max_issuance !== null) {
    const { count } = await adminClient
      .from("coupons")
      .select("id", { count: "exact", head: true })
      .eq("template_id", templateId);
    if (count !== null && count >= template.max_issuance) {
      return NextResponse.json({ error: "このクーポンは発行上限に達しています" }, { status: 400 });
    }
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + template.valid_days);

  // クーポン発行
  const { error: couponError } = await adminClient.from("coupons").insert({
    template_id: templateId,
    user_id: user.id,
    source: "point_exchange",
    expires_at: expiresAt.toISOString(),
  });

  if (couponError) {
    return NextResponse.json({ error: couponError.message }, { status: 500 });
  }

  // ポイント消費 (トリガーで残高更新)
  const { error: ptError } = await adminClient.from("point_transactions").insert({
    user_id: user.id,
    amount: -template.point_cost,
    type: "coupon_exchange",
  });

  if (ptError) {
    return NextResponse.json({ error: ptError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
