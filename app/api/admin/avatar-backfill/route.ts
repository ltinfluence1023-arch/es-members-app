import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

async function isMaster(userId: string) {
  const { data } = await createAdminClient()
    .from("admin_users")
    .select("id, role")
    .eq("id", userId)
    .single();
  return data?.role === "admin";
}

// One-time backfill: scan storage 'avatars' bucket and set users.avatar_url
// for users who already uploaded an avatar before the avatar_url column existed.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isMaster(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = createAdminClient();

  const { data: files, error } = await adminClient.storage
    .from("avatars")
    .list("", { limit: 1000 });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let updated = 0;
  for (const file of files ?? []) {
    // file.name is the userId (we used user.id as the storage key)
    const { data: { publicUrl } } = adminClient.storage
      .from("avatars")
      .getPublicUrl(file.name);
    const url = `${publicUrl}?v=${new Date(file.updated_at ?? Date.now()).getTime()}`;

    const { error: upErr } = await adminClient
      .from("users")
      .update({ avatar_url: url })
      .eq("id", file.name);

    if (!upErr) updated++;
  }

  return NextResponse.json({ updated, total: files?.length ?? 0 });
}
