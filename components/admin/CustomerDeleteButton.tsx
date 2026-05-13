"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export function CustomerDeleteButton({ userId, nickname }: { userId: string; nickname: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const ok = confirm(
      `「${nickname}」を削除しますか？\n\n` +
      `・取引履歴・来店履歴・クーポン等もすべて削除されます\n` +
      `・この操作は取り消せません`
    );
    if (!ok) return;

    const confirmText = prompt(`削除を確定するには「${nickname}」と入力してください`);
    if (confirmText !== nickname) {
      toast.error("入力が一致しないためキャンセルしました");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "削除失敗"); return; }
      toast.success("顧客を削除しました");
      router.push("/admin/customers");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
    >
      <Trash2 size={13} />
      {loading ? "削除中..." : "顧客を削除"}
    </button>
  );
}
