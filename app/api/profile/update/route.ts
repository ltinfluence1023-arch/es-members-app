import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkAutoAchievements } from "@/lib/utils/autoAchievements";

const schema = z.object({
  nickname: z.string().min(1).max(20).optional(),
  bio: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "入力が不正です" }, { status: 400 });

  const { nickname, bio } = parsed.data;
  const adminClient = createAdminClient();

  if (nickname) {
    const { error } = await adminClient.from("users").update({ nickname }).eq("id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (bio !== undefined) {
    const { error } = await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, bio },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (nickname) await checkAutoAchievements(user.id, "profile");

  return NextResponse.json({ success: true });
}
