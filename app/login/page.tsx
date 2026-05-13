"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { LineAutoLogin } from "@/components/customer/LineAutoLogin";

const loginSchema = z.object({
  email: z.string().email("メールアドレスの形式が正しくありません"),
  password: z.string().min(6, "パスワードは6文字以上です"),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
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
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) {
      toast.error("ログインに失敗しました: " + error.message);
      setLoading(false);
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-page-in">

        {/* Logo */}
        <div className="mb-10 text-center animate-fade-in">
          <div className="mb-3">
            <span className="text-[11px] font-bold tracking-[0.4em] uppercase text-muted-foreground">
              members
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-[0.12em] lowercase" style={{ color: "var(--primary)" }}>
            flair bar es
          </h1>
          <div className="mt-2 flex items-center justify-center gap-2">
            <div className="h-px w-8 opacity-30" style={{ background: "var(--primary)" }} />
            <p className="text-[11px] text-muted-foreground tracking-[0.2em]">会員ログイン</p>
            <div className="h-px w-8 opacity-30" style={{ background: "var(--primary)" }} />
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 animate-slide-up">
          <div className="space-y-1.5">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="your@email.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
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

          <Button
            type="submit"
            className="w-full interactive"
            disabled={loading}
          >
            {loading ? "ログイン中..." : "ログイン"}
          </Button>
        </form>

        {/* LINE login (only shown if NEXT_PUBLIC_LIFF_ID is set) */}
        <div className="mt-4">
          <LineAutoLogin />
        </div>

        <p className="mt-5 text-center text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: "0.15s" }}>
          アカウントをお持ちでない方は{" "}
          <Link href="/signup" className="text-primary hover:opacity-80 transition-opacity">
            新規登録
          </Link>
        </p>
      </div>
    </div>
  );
}
