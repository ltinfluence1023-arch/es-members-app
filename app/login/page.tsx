"use client";

import { LineAutoLogin } from "@/components/customer/LineAutoLogin";

export default function LoginPage() {
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

        {/* LINE login */}
        <div className="animate-slide-up">
          <LineAutoLogin />
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground animate-fade-in"
          style={{ animationDelay: "0.15s" }}>
          初回ログイン時に会員登録が完了します
        </p>
      </div>
    </div>
  );
}
