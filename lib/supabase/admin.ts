import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

// R-705: SERVICE_ROLE_KEY はサーバー側のみで使用。クライアントに露出禁止。
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
