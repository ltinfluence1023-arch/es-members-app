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

// Recompute chip_balance for every user from chip_transactions ledger.
// Use this when balance and history are out of sync (e.g. after fixing
// the historical admin-reduction bug).
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isMaster(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = createAdminClient();

  // Pull entire ledger
  const { data: txs, error: txErr } = await adminClient
    .from("chip_transactions")
    .select("type, amount, from_user_id, to_user_id");
  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });

  // Compute net balance per user
  const net: Record<string, number> = {};
  for (const t of txs ?? []) {
    if (t.to_user_id) {
      net[t.to_user_id] = (net[t.to_user_id] ?? 0) + t.amount;
    }
    if (t.from_user_id && (t.type === "transfer" || t.type === "admin")) {
      net[t.from_user_id] = (net[t.from_user_id] ?? 0) - t.amount;
    }
  }

  // Pull all users
  const { data: users, error: usersErr } = await adminClient
    .from("users")
    .select("id, nickname, chip_balance");
  if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 });

  let fixedCount = 0;
  const changes: { id: string; nickname: string; before: number; after: number }[] = [];

  for (const u of users ?? []) {
    const computed = Math.max(0, net[u.id] ?? 0);
    if (computed !== u.chip_balance) {
      const { error: upErr } = await adminClient
        .from("users")
        .update({ chip_balance: computed })
        .eq("id", u.id);
      if (!upErr) {
        fixedCount++;
        changes.push({
          id: u.id,
          nickname: u.nickname,
          before: u.chip_balance,
          after: computed,
        });
      }
    }
  }

  return NextResponse.json({
    fixedCount,
    totalUsers: users?.length ?? 0,
    changes,
  });
}
