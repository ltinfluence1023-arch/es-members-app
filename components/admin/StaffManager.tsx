"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, KeyRound, UserPlus, X, ShieldCheck, User as UserIcon, Sparkles, Calculator, Eye, EyeOff } from "lucide-react";

const ADMIN_EMAIL_DOMAIN = "admin.local";

interface Staff {
  id: string;
  email: string;
  name: string;
  role: "admin" | "staff";
  created_at: string;
}

function emailToLoginId(email: string): string {
  if (email.endsWith(`@${ADMIN_EMAIL_DOMAIN}`)) {
    return email.slice(0, -1 * (`@${ADMIN_EMAIL_DOMAIN}`.length));
  }
  return email;
}

export function StaffManager({ initialStaff, currentUserId }: { initialStaff: Staff[]; currentUserId: string }) {
  const router = useRouter();
  const [staff, setStaff] = useState<Staff[]>(initialStaff);
  const [showCreate, setShowCreate] = useState(false);
  const [showMyPw, setShowMyPw] = useState(false);
  const [revealedPw, setRevealedPw] = useState<Record<string, string>>({}); // staffId → plain password

  async function refresh() {
    const res = await fetch("/api/admin/staff");
    if (res.ok) {
      const json = await res.json();
      setStaff(json.staff);
    }
    router.refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`${name} を削除しますか？この操作は取り消せません。`)) return;
    const res = await fetch(`/api/admin/staff/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "削除失敗"); return; }
    toast.success("削除しました");
    refresh();
  }

  async function togglePassword(id: string) {
    if (revealedPw[id]) {
      setRevealedPw(({ [id]: _omit, ...rest }) => rest);
      return;
    }
    const res = await fetch(`/api/admin/staff/${id}/password`);
    const data = await res.json();
    if (!res.ok) { toast.error(data.error ?? "取得失敗"); return; }
    setRevealedPw((prev) => ({ ...prev, [id]: data.password ?? "(未保存)" }));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">{staff.length} アカウント</p>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (!confirm("過去に作成されたスタッフアカウントが顧客一覧に混入している場合、それらを顧客一覧から除外します。実行しますか？")) return;
              const res = await fetch("/api/admin/staff/cleanup", { method: "POST" });
              const data = await res.json();
              if (!res.ok) { toast.error(data.error ?? "失敗"); return; }
              toast.success(`${data.removed} 件をクリーンアップしました`);
              router.refresh();
            }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold border border-border text-muted-foreground hover:text-foreground transition-colors"
            title="過去の混入分を顧客一覧から除外"
          >
            <Sparkles size={13} />
            混入クリーンアップ
          </button>
          <button
            onClick={async () => {
              if (!confirm("全ユーザーのチップ残高を取引履歴から再計算します。実行しますか？")) return;
              const res = await fetch("/api/admin/chip-recalc", { method: "POST" });
              const data = await res.json();
              if (!res.ok) { toast.error(data.error ?? "失敗"); return; }
              toast.success(`${data.fixedCount} 件の残高を修正しました（全${data.totalUsers}人中）`);
              router.refresh();
            }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold border border-border text-muted-foreground hover:text-foreground transition-colors"
            title="チップ残高を取引履歴から再計算"
          >
            <Calculator size={13} />
            残高再計算
          </button>
          <button
            onClick={() => setShowMyPw(true)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold border border-border text-muted-foreground hover:text-foreground transition-colors"
            title="自身のパスワードを変更"
          >
            <KeyRound size={13} />
            自分のPW変更
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-white interactive"
            style={{ background: "var(--primary)" }}
          >
            <UserPlus size={14} />
            新規追加
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="py-2.5 px-4 text-left text-xs text-muted-foreground font-medium">名前</th>
              <th className="py-2.5 px-4 text-left text-xs text-muted-foreground font-medium">ログインID</th>
              <th className="py-2.5 px-4 text-left text-xs text-muted-foreground font-medium">PW</th>
              <th className="py-2.5 px-4 text-left text-xs text-muted-foreground font-medium">権限</th>
              <th className="py-2.5 px-4 text-left text-xs text-muted-foreground font-medium hidden md:table-cell">作成日</th>
              <th className="py-2.5 px-4 text-right text-xs text-muted-foreground font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => {
              const pw = revealedPw[s.id];
              return (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="py-3 px-4 font-medium">
                    {s.name}
                    {s.id === currentUserId && (
                      <span className="ml-2 text-xs text-muted-foreground">(自分)</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs font-mono">{emailToLoginId(s.email)}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => togglePassword(s.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-mono"
                      title={pw ? "クリックで隠す" : "クリックで表示"}
                    >
                      {pw ? (
                        <>
                          <span className="select-all">{pw}</span>
                          <EyeOff size={12} className="text-muted-foreground" />
                        </>
                      ) : (
                        <>
                          <span className="text-muted-foreground tracking-widest">••••••••</span>
                          <Eye size={12} className="text-muted-foreground" />
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold"
                      style={{
                        background: s.role === "admin" ? "var(--primary)" : "oklch(0.5 0.05 270 / 0.2)",
                        color: s.role === "admin" ? "#fff" : "var(--foreground)",
                      }}
                    >
                      {s.role === "admin" ? <ShieldCheck size={10} /> : <UserIcon size={10} />}
                      {s.role === "admin" ? "マスター" : "スタッフ"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs hidden md:table-cell">
                    {new Date(s.created_at).toLocaleDateString("ja-JP")}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {s.id !== currentUserId ? (
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="削除"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted-foreground">
        💡 PW欄をタップすると確認できます。各スタッフはこの画面の「自分のPW変更」から自身のパスワードを更新できます。
      </p>

      {showCreate && (
        <CreateStaffModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); refresh(); }}
        />
      )}

      {showMyPw && (
        <MyPasswordModal onClose={() => setShowMyPw(false)} />
      )}
    </div>
  );
}

function CreateStaffModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, loginId, password, role }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "作成失敗"); return; }
      toast.success("アカウントを作成しました");
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-5 space-y-4 animate-page-in">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">新規アカウント作成</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">名前</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 rounded-lg border border-border bg-input px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">ログインID（半角英数字・_ . -）</label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={32}
              pattern="[a-zA-Z0-9_.\-]+"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="manager01"
              autoCapitalize="none"
              spellCheck={false}
              className="w-full mt-1 rounded-lg border border-border bg-input px-3 py-2 text-sm font-mono"
            />
            <p className="text-[11px] text-muted-foreground mt-1">顧客アカウントとは別系統です</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">パスワード（8文字以上）</label>
            <input
              type="text"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 rounded-lg border border-border bg-input px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">権限</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setRole("staff")}
                className={`rounded-lg py-2 text-sm font-bold border transition-colors ${
                  role === "staff" ? "border-primary text-primary" : "border-border text-muted-foreground"
                }`}
              >
                スタッフ
              </button>
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`rounded-lg py-2 text-sm font-bold border transition-colors ${
                  role === "admin" ? "border-primary text-primary" : "border-border text-muted-foreground"
                }`}
              >
                マスター
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-2.5 text-sm font-bold text-white interactive disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            {loading ? "作成中..." : "作成"}
          </button>
        </form>
      </div>
    </div>
  );
}

function MyPasswordModal({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/me/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "変更失敗"); return; }
      toast.success("パスワードを変更しました");
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-5 space-y-4 animate-page-in">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">自分のパスワードを変更</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">新しいパスワードを入力してください</p>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="text" required minLength={8} value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8文字以上"
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm font-mono"
          />
          <button
            type="submit" disabled={loading}
            className="w-full rounded-lg py-2.5 text-sm font-bold text-white interactive disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            {loading ? "変更中..." : "変更"}
          </button>
        </form>
      </div>
    </div>
  );
}
