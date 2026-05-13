"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

const schema = z.object({
  amount: z.number({ message: "金額を入力してください" }).int().positive("1以上を入力してください"),
});
type FormData = z.infer<typeof schema>;

interface QrInfo {
  toNickname: string;
  senderBalance: number;
}

export default function TransferPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [info, setInfo] = useState<QrInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const amount = watch("amount");
  const fee = typeof amount === "number" && amount > 0 ? Math.floor(amount * 0.1) : 0;
  const netAmount = typeof amount === "number" && amount > 0 ? amount - fee : 0;

  useEffect(() => {
    async function fetchInfo() {
      try {
        const res = await fetch(`/api/transfer/info?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setInfo(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    }
    fetchInfo();
  }, [token]);

  async function onSubmit(values: FormData) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, amount: values.amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${data.toNickname} さんに ${data.netAmount.toLocaleString()} チップを送りました（手数料 -${data.fee} chip）`);
      router.push("/home");
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "エラーが発生しました";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-6 text-center text-sm text-muted-foreground">読み込み中...</div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6 space-y-4">
        <p className="text-center text-sm text-destructive">{error}</p>
        <button onClick={() => router.back()} className="w-full text-sm text-muted-foreground underline">
          戻る
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold">チップを送る</h1>
        <p className="text-sm text-muted-foreground mt-1">
          <span className="text-foreground font-medium">{info?.toNickname}</span> さんへ送金
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground mb-1">🪙 あなたの残高</p>
        <p className="text-2xl font-bold" style={{ color: "var(--chip)" }}>
          {(info?.senderBalance ?? 0).toLocaleString()}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">送金額</label>
          <input
            type="number"
            min={1}
            {...register("amount", { valueAsNumber: true })}
            placeholder="例: 100"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.amount && (
            <p className="text-xs text-destructive">{errors.amount.message}</p>
          )}
        </div>

        {/* Fee preview */}
        {typeof amount === "number" && amount > 0 && (
          <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">送金額</span>
              <span className="font-mono font-bold">{amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">手数料 (10%)</span>
              <span className="font-mono font-bold" style={{ color: "var(--destructive)" }}>
                -{fee.toLocaleString()}
              </span>
            </div>
            <div className="border-t border-border pt-1.5 flex justify-between">
              <span className="text-muted-foreground">相手に届く</span>
              <span className="font-mono font-black" style={{ color: "var(--chip)" }}>
                {netAmount.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting ? "送金中..." : "送金する"}
        </button>
      </form>

      <button onClick={() => router.back()} className="w-full text-sm text-muted-foreground underline">
        キャンセル
      </button>
    </div>
  );
}
