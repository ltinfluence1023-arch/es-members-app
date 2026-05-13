"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Lock } from "lucide-react";

const ADMIN_EMAIL_DOMAIN = "admin.local";

const loginSchema = z.object({
  loginId: z.string().min(3, "ログインIDを入力してください"),
  password: z.string().min(6, "パスワードを入力してください"),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginForm) {
    setLoading(true);
    const supabase = createClient();
    // If input contains @, treat as email (legacy admin accounts); else synthesize
    const email = data.loginId.includes("@")
      ? data.loginId.trim()
      : `${data.loginId.toLowerCase()}@${ADMIN_EMAIL_DOMAIN}`;
    const { data: signIn, error } = await supabase.auth.signInWithPassword({
      email,
      password: data.password,
    });
    if (error || !signIn.user) {
      toast.error("ログインに失敗しました");
      setLoading(false);
      return;
    }

    // Verify admin via API
    const res = await fetch("/api/admin/verify", { method: "POST" });
    if (!res.ok) {
      await supabase.auth.signOut();
      toast.error("管理者権限がありません");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-page-in">

        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center justify-center w-12 h-12 rounded-full"
            style={{ background: "var(--primary)" }}>
            <Lock size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-[0.12em] lowercase mt-2" style={{ color: "var(--primary)" }}>
            flair bar es
          </h1>
          <p className="text-[11px] text-muted-foreground tracking-[0.2em] mt-2">管理者ログイン</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 animate-slide-up">
          <div className="space-y-1.5">
            <Label htmlFor="loginId">ログインID</Label>
            <Input
              id="loginId"
              type="text"
              autoComplete="username"
              placeholder="es000"
              autoCapitalize="none"
              spellCheck={false}
              {...register("loginId")}
            />
            {errors.loginId && (
              <p className="text-xs text-destructive">{errors.loginId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full interactive" disabled={loading}>
            {loading ? "ログイン中..." : "ログイン"}
          </Button>
        </form>
      </div>
    </div>
  );
}
