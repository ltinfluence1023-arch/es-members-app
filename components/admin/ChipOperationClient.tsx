"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface User {
  id: string;
  nickname: string;
  chip_balance: number;
}

type Mode = "add" | "deduct";

export function ChipOperationClient({ users }: { users: User[] }) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [mode, setMode] = useState<Mode>("add");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedUser = users.find((u) => u.id === userId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseInt(amount, 10);
    if (!userId) { toast.error("顧客を選択してください"); return; }
    if (!num || num <= 0) { toast.error("1以上の金額を入力してください"); return; }
    if (mode === "deduct" && selectedUser && num > selectedUser.chip_balance) {
      toast.error("残高を超えて減算できません");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/chip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          amount: mode === "deduct" ? -num : num,
          memo: memo || (mode === "add" ? "チップ購入" : "訂正・返金"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(
        mode === "add"
          ? `${selectedUser?.nickname} に ${num.toLocaleString()} チップを付与しました`
          : `${selectedUser?.nickname} から ${num.toLocaleString()} チップを減算しました`
      );
      setAmount("");
      setMemo("");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5 space-y-5">

      {/* 顧客選択 */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">顧客</label>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">選択してください</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nickname}（残高: {u.chip_balance.toLocaleString()}）
            </option>
          ))}
        </select>
      </div>

      {/* 現在の残高表示 */}
      {selectedUser && (
        <div className="rounded-lg bg-muted/50 px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">現在のチップ残高</span>
          <span className="text-lg font-bold font-mono" style={{ color: "var(--chip)" }}>
            {selectedUser.chip_balance.toLocaleString()}
          </span>
        </div>
      )}

      {/* 操作モード */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">操作</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("add")}
            className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
              mode === "add"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            ＋ 付与（購入）
          </button>
          <button
            type="button"
            onClick={() => setMode("deduct")}
            className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
              mode === "deduct"
                ? "bg-destructive text-destructive-foreground border-destructive"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            － 減算（訂正）
          </button>
        </div>
      </div>

      {/* 金額 */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">チップ数</label>
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="例: 500"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {selectedUser && amount && parseInt(amount) > 0 && (
          <p className="text-xs text-muted-foreground">
            操作後の残高:{" "}
            <span className="font-semibold" style={{ color: "var(--chip)" }}>
              {(
                mode === "add"
                  ? selectedUser.chip_balance + parseInt(amount)
                  : selectedUser.chip_balance - parseInt(amount)
              ).toLocaleString()}
            </span>
          </p>
        )}
      </div>

      {/* メモ */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">メモ（任意）</label>
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder={mode === "add" ? "チップ購入" : "訂正・返金"}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full rounded-xl py-3 font-semibold text-sm transition-opacity disabled:opacity-50 ${
          mode === "add"
            ? "bg-primary text-primary-foreground hover:opacity-90"
            : "bg-destructive text-destructive-foreground hover:opacity-90"
        }`}
      >
        {loading
          ? "処理中..."
          : mode === "add"
          ? "チップを付与する"
          : "チップを減算する"}
      </button>
    </form>
  );
}
