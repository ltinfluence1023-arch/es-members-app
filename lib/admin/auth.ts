import { createAdminClient } from "@/lib/supabase/admin";

import type { AdminRole } from "@/lib/admin/permissions";

export type { AdminRole };
export interface AdminInfo { id: string; name: string; role: AdminRole }

export async function getAdminInfo(userId: string): Promise<AdminInfo | null> {
  const { data } = await createAdminClient()
    .from("admin_users")
    .select("id, name, role")
    .eq("id", userId)
    .single();
  return data ? { id: data.id, name: data.name, role: data.role } : null;
}

export async function isAdmin(userId: string): Promise<boolean> {
  return (await getAdminInfo(userId)) !== null;
}

export async function isMaster(userId: string): Promise<boolean> {
  const info = await getAdminInfo(userId);
  return info?.role === "admin";
}
