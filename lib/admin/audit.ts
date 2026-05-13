import { createAdminClient } from "@/lib/supabase/admin";
import type { NextRequest } from "next/server";
import { getAdminInfo } from "./auth";

export type AuditCategory =
  | "auth"
  | "coupon"
  | "customer"
  | "fee"
  | "chip"
  | "point"
  | "staff"
  | "notice"
  | "quiz"
  | "other";

interface AuditEntry {
  action: string;
  category: AuditCategory;
  summary?: string | null;
  target_type?: string | null;
  target_id?: string | null;
  target_label?: string | null;
  details?: Record<string, unknown> | null;
  actor_id?: string | null;
  request?: NextRequest;
}

/**
 * Record an admin action to the audit_logs table.
 * Errors are swallowed (audit logging must never break a real operation).
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    const adminClient = createAdminClient();

    let actorName: string | null = null;
    if (entry.actor_id) {
      const info = await getAdminInfo(entry.actor_id);
      actorName = info?.name ?? null;
    }

    const ip = entry.request?.headers.get("x-forwarded-for")?.split(",")[0].trim()
      ?? entry.request?.headers.get("x-real-ip")
      ?? null;
    const ua = entry.request?.headers.get("user-agent") ?? null;

    await adminClient.from("audit_logs").insert({
      action: entry.action,
      category: entry.category,
      summary: entry.summary ?? null,
      target_type: entry.target_type ?? null,
      target_id: entry.target_id ?? null,
      target_label: entry.target_label ?? null,
      details: (entry.details ?? null) as never,
      actor_id: entry.actor_id ?? null,
      actor_name: actorName,
      ip_address: ip,
      user_agent: ua,
    });
  } catch (err) {
    console.error("audit log failed", err);
  }
}
