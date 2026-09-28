import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isMaster } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { sendPush, chipNoticeText } from "@/lib/line/messaging";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), chips: z.number().int().min(0), note: z.string().max(200).optional() }),
  z.object({ action: z.literal("reject"), note: z.string().trim().min(1, "却下理由を入力してください").max(200) }),
]);

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_AMOUNT: "チップ数が不正です",
  REQUEST_NOT_PENDING: "この申請はすでに処理済みです",
  ALREADY_MIGRATED: "この旧会員ID、またはこのお客様はすでに引き継ぎ済みです",
};

// 引き継ぎ申請の承認・却下（マスターのみ）
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isMaster(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "入力が不正です" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: req } = await adminClient
    .from("legacy_migration_requests")
    .select("user_id, legacy_member_id, legacy_name, reported_chips, status")
    .eq("id", id)
    .single();
  if (!req) return NextResponse.json({ error: "申請が見つかりません" }, { status: 404 });
  if (req.status !== "pending") return NextResponse.json({ error: ERROR_MESSAGES.REQUEST_NOT_PENDING }, { status: 409 });

  const { data: customer } = await adminClient
    .from("users").select("nickname, line_user_id").eq("id", req.user_id).single();
  const body = parsed.data;

  if (body.action === "approve") {
    const { error } = await adminClient.rpc("legacy_migration_approve", {
      p_request_id: id,
      p_chips: body.chips,
      p_staff_id: user.id,
      p_note: body.note ?? "",
    });
    if (error) {
      const code = Object.keys(ERROR_MESSAGES).find((k) => error.message.includes(k));
      return NextResponse.json({ error: code ? ERROR_MESSAGES[code] : "承認に失敗しました" }, { status: 400 });
    }

    if (customer?.line_user_id && body.chips > 0) {
      const { data: after } = await adminClient.from("users").select("chip_balance").eq("id", req.user_id).single();
      await sendPush(customer.line_user_id, chipNoticeText(body.chips, after?.chip_balance ?? 0, "旧アプリからの引き継ぎ"));
    }
  } else {
    const { error } = await adminClient
      .from("legacy_migration_requests")
      .update({ status: "rejected", review_note: body.note, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pending");
    if (error) return NextResponse.json({ error: "却下に失敗しました" }, { status: 500 });

    if (customer?.line_user_id) {
      await sendPush(customer.line_user_id, [
        "旧アプリからの引き継ぎ申請について",
        "",
        "申請内容を確認できませんでした。",
        `理由: ${body.note}`,
        "",
        "アプリのメニュー「旧アプリからの引き継ぎ」から再度申請してください。",
      ].join("\n"));
    }
  }

  await recordAudit({
    action: body.action === "approve" ? "legacy_migration_approve" : "legacy_migration_reject",
    category: "customer",
    summary: body.action === "approve"
      ? `旧アプリ引き継ぎ承認: ${customer?.nickname ?? "—"} ← 旧会員ID ${req.legacy_member_id}（${req.legacy_name}）${body.chips.toLocaleString()} chip`
      : `旧アプリ引き継ぎ却下: ${customer?.nickname ?? "—"}（旧会員ID ${req.legacy_member_id}）${body.note}`,
    target_type: "user",
    target_id: req.user_id,
    target_label: customer?.nickname ?? null,
    details: { request_id: id, legacy_member_id: req.legacy_member_id, reported_chips: req.reported_chips, ...body },
    actor_id: user.id,
    request,
  });

  return NextResponse.json({ success: true });
}
