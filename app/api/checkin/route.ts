import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { haversineMeters, getStoreLocationConfig } from "@/lib/utils/geo";

// R-201〜R-206: チェックインルール
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Location verification (if configured)
  const storeLoc = getStoreLocationConfig();
  if (storeLoc) {
    let body: { lat?: number; lng?: number; accuracy?: number } = {};
    try {
      body = await request.json();
    } catch {
      // no body
    }
    const { lat, lng, accuracy } = body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json(
        { error: "位置情報が取得できませんでした。位置情報の利用を許可してから再度お試しください。" },
        { status: 400 },
      );
    }

    // Reject if GPS accuracy is poor (likely spoofed or weak signal)
    const MAX_ACCURACY_M = 200;
    if (typeof accuracy === "number" && accuracy > MAX_ACCURACY_M) {
      return NextResponse.json(
        {
          error: `位置情報の精度が低すぎます（誤差 ${Math.round(accuracy)}m）。屋外または窓際で再度お試しください。`,
        },
        { status: 400 },
      );
    }

    const distance = haversineMeters(storeLoc.lat, storeLoc.lng, lat, lng);
    if (distance > storeLoc.radiusM) {
      return NextResponse.json(
        {
          error: `店舗から離れすぎています（距離 約${Math.round(distance)}m）。店舗内でチェックインしてください。`,
        },
        { status: 403 },
      );
    }
  }

  const adminClient = createAdminClient();

  const { data: userData } = await adminClient
    .from("users")
    .select("rank_id, ranks(checkin_bonus)")
    .eq("id", user.id)
    .single();

  const userWithRank = userData as { rank_id: string | null; ranks: { checkin_bonus: number } | null } | null;
  const checkinBonus = userWithRank?.ranks?.checkin_bonus ?? 500;

  const { error: visitError } = await adminClient.from("visits").insert({
    user_id: user.id,
    bonus_chip: checkinBonus,
    store_id: process.env.STORE_ID ?? "main",
  });

  if (visitError) {
    if (visitError.code === "23505") {
      return NextResponse.json(
        { error: "本日はすでにチェックイン済みです" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: visitError.message }, { status: 500 });
  }

  const { error: txError } = await adminClient.from("chip_transactions").insert({
    to_user_id: user.id,
    amount: checkinBonus,
    type: "checkin",
  });

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 });
  }

  // チェックインポイント (10pt) — トリガーで残高更新
  const POINT_BONUS = 10;
  await adminClient.from("point_transactions").insert({
    user_id: user.id,
    amount: POINT_BONUS,
    type: "checkin",
    memo: "チェックインポイント",
  });

  return NextResponse.json({ success: true, bonus: checkinBonus, pointBonus: POINT_BONUS });
}
