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

const signupSchema = z
  .object({
    nickname: z.string().min(1, "ニックネームを入力してください").max(20),
    email: z.string().email("メールアドレスの形式が正しくありません"),
    password: z.string().min(8, "パスワードは8文字以上です"),
    confirm: z.string(),
    birthday: z.string().min(1, "生年月日を入力してください"),
    gender: z.enum(["male", "female", "other"], { message: "性別を選択してください" }),
  })
  .refine((d) => d.password === d.confirm, {
    message: "パスワードが一致しません",
    path: ["confirm"],
  });
type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupForm>({ resolver: zodResolver(signupSchema) });

  const gender = watch("gender");

  async function onSubmit(data: SignupForm) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: data.nickname,
          email: data.email,
          password: data.password,
          birthday: data.birthday,
          gender: data.gender,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success("登録しました！");
      router.push("/home");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm animate-page-in">

        {/* Logo */}
        <div className="mb-8 text-center animate-fade-in">
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
            <p className="text-[11px] text-muted-foreground tracking-[0.2em]">新規会員登録</p>
            <div className="h-px w-8 opacity-30" style={{ background: "var(--primary)" }} />
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 animate-slide-up">
          <div className="space-y-1.5">
            <Label htmlFor="nickname">ニックネーム</Label>
            <Input
              id="nickname"
              type="text"
              placeholder="例: es太郎"
              {...register("nickname")}
            />
            {errors.nickname && (
              <p className="text-xs text-destructive">{errors.nickname.message}</p>
            )}
          </div>

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
              autoComplete="new-password"
              placeholder="8文字以上"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">パスワード確認</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="もう一度入力"
              {...register("confirm")}
            />
            {errors.confirm && (
              <p className="text-xs text-destructive">{errors.confirm.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="birthday">生年月日</Label>
            <Input
              id="birthday"
              type="date"
              {...register("birthday")}
            />
            {errors.birthday && (
              <p className="text-xs text-destructive">{errors.birthday.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>性別</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: "male" as const, label: "男性" },
                { v: "female" as const, label: "女性" },
                { v: "other" as const, label: "その他" },
              ].map((g) => (
                <button
                  key={g.v}
                  type="button"
                  onClick={() => setValue("gender", g.v, { shouldValidate: true })}
                  className={`rounded-lg py-2 text-sm font-bold border transition-colors ${
                    gender === g.v
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            {errors.gender && (
              <p className="text-xs text-destructive">{errors.gender.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full interactive"
            disabled={loading}
          >
            {loading ? "登録中..." : "登録する"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: "0.15s" }}>
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className="text-primary hover:opacity-80 transition-opacity">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
