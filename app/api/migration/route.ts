import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  legacyMemberId: z.string().trim().min(1, "旧アプリの会員IDを入力してください").max(20),
  legacyName: z.string().trim().min(1, "旧アプリでのお名前を入力してください").max(50),
  reportedChips: z.number().int().min(0, "チップ残高が不正です").max(100_000_000, "チップ残高が不正です"),
});

// 旧アプリからの引き継ぎ申請。照合・付与はマスターが手作業で行う（/admin/migrations）
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "入力が不正です" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: existing } = await adminClient
    .from("legacy_migration_requests")
    .select("status")
    .eq("user_id", user.id)
    .in("status", ["pending", "approved"])
    .limit(1)
    .maybeSingle();
  if (existing?.status === "pending") {
    return NextResponse.json({ error: "申請はすでに受け付けています。確認までお待ちください" }, { status: 409 });
  }
  if (existing?.status === "approved") {
    return NextResponse.json({ error: "引き継ぎはすでに完了しています" }, { status: 409 });
  }

  const { error } = await adminClient.from("legacy_migration_requests").insert({
    user_id: user.id,
    legacy_member_id: parsed.data.legacyMemberId,
    legacy_name: parsed.data.legacyName,
    reported_chips: parsed.data.reportedChips,
  });
  if (error) return NextResponse.json({ error: "申請に失敗しました。時間をおいて再度お試しください" }, { status: 500 });

  return NextResponse.json({ success: true });
}
