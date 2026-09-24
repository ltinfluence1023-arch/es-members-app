"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminQRScanner } from "@/components/admin/AdminQRScanner";
import { AvatarImage } from "@/components/customer/AvatarImage";
import type { PokerSeatState, PokerSeatUser, PokerTableState } from "@/lib/admin/poker";

const QUICK_AMOUNTS = [100, 500, 1000, 5000];

async function postJson(url: string, body: unknown, method = "POST") {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "エラーが発生しました");
  return data;
}

function toInt(v: string): number {
  const n = parseInt(v.replace(/,/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function ChipAmountField({
  label,
  hint,
  value,
  onChange,
  error,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium">{label}</label>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-lg font-mono focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <div className="flex flex-wrap gap-1.5">
        {QUICK_AMOUNTS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onChange(String(toInt(value) + q))}
            className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            +{q.toLocaleString()}
          </button>
        ))}
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-full px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            クリア
          </button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function CustomerCard({ user, sub }: { user: PokerSeatUser; sub?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
      <AvatarImage userId={user.id} nickname={user.nickname} src={user.avatar_url} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{user.nickname}</p>
        {sub}
      </div>
      <div className="text-right">
        <p className="text-[10px] text-muted-foreground">アカウント残高</p>
        <p className="font-mono font-bold" style={{ color: "var(--chip)" }}>
          {user.chip_balance.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

/** 引き出し + 購入の入力（着席・追加で共通） */
function BuyInForm({
  user,
  submitLabel,
  onSubmit,
}: {
  user: PokerSeatUser;
  submitLabel: string;
  onSubmit: (withdraw: number, purchase: number) => Promise<void>;
}) {
  const [withdraw, setWithdraw] = useState("");
  const [purchase, setPurchase] = useState("");
  const [loading, setLoading] = useState(false);

  const w = toInt(withdraw);
  const p = toInt(purchase);
  const overBalance = w > user.chip_balance;
  const canSubmit = w + p > 0 && !overBalance && !loading;

  async function submit() {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await onSubmit(w, p);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <ChipAmountField
        label="引き出し"
        hint="アカウント残高から"
        value={withdraw}
        onChange={setWithdraw}
        error={overBalance ? "残高を超えています" : null}
      />
      <ChipAmountField label="購入" hint="現金で購入（残高は変わりません）" value={purchase} onChange={setPurchase} />

      <div className="rounded-lg border border-border px-3 py-2 text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">卓に出すチップ</span>
          <span className="font-mono font-bold">{(w + p).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">引き出し後の残高</span>
          <span className="font-mono">{Math.max(0, user.chip_balance - w).toLocaleString()}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40 interactive"
      >
        {loading ? "処理中..." : submitLabel}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// 空席タップ → QR読み取り → 着席
// ─────────────────────────────────────────────
export function SeatInDialog({
  table,
  seatNo,
  onClose,
  onDone,
}: {
  table: PokerTableState;
  seatNo: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [customer, setCustomer] = useState<PokerSeatUser | null>(null);

  async function lookup(token: string) {
    const data = await postJson("/api/admin/poker/lookup", { token });
    setCustomer(data.user);
  }

  async function seatIn(withdraw: number, purchase: number) {
    if (!customer) return;
    await postJson("/api/admin/poker/seat-in", {
      tableId: table.id,
      seatNo,
      userId: customer.id,
      withdraw,
      purchase,
    });
    toast.success(`${customer.nickname} さんが P${seatNo} に着席しました`);
    onDone();
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{table.name} P{seatNo} に着席</DialogTitle>
          <DialogDescription>
            {customer ? "引き出し・購入するチップ数を入力してください" : "お客様のマイQRコードを読み取ってください"}
          </DialogDescription>
        </DialogHeader>

        {customer ? (
          <div className="space-y-4">
            <CustomerCard
              user={customer}
              sub={
                <button type="button" onClick={() => setCustomer(null)} className="text-xs text-muted-foreground underline">
                  読み取り直す
                </button>
              }
            />
            <BuyInForm user={customer} submitLabel="着席する" onSubmit={seatIn} />
          </div>
        ) : (
          <AdminQRScanner onToken={lookup} />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// 着席中タップ → 追加 / 退席
// ─────────────────────────────────────────────
function elapsed(iso: string): string {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  return min < 60 ? `${min}分` : `${Math.floor(min / 60)}時間${min % 60}分`;
}

export function SeatActionDialog({
  table,
  seat,
  onClose,
  onDone,
}: {
  table: PokerTableState;
  seat: PokerSeatState;
  onClose: () => void;
  onDone: () => void;
}) {
  const [tab, setTab] = useState<"add" | "out">("add");
  const [cashOut, setCashOut] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const buyIn = seat.withdrawTotal + seat.purchaseTotal;
  const out = cashOut === "" ? null : Math.max(0, parseInt(cashOut, 10) || 0);
  const diff = out === null ? null : out - buyIn;

  async function add(withdraw: number, purchase: number) {
    await postJson("/api/admin/poker/add", { sessionId: seat.sessionId, withdraw, purchase });
    toast.success(`P${seat.seatNo} ${seat.user.nickname} さんにチップを追加しました`);
    onDone();
  }

  async function seatOut() {
    if (out === null) return;
    setLoading(true);
    try {
      await postJson("/api/admin/poker/seat-out", { sessionId: seat.sessionId, cashOut: out });
      toast.success(`${seat.user.nickname} さんが退席しました（${out.toLocaleString()} チップを残高へ）`);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "エラーが発生しました");
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{table.name} P{seat.seatNo}</DialogTitle>
          <DialogDescription>着席 {elapsed(seat.seatedAt)}</DialogDescription>
        </DialogHeader>

        <CustomerCard
          user={seat.user}
          sub={
            <p className="text-[11px] text-muted-foreground">
              引き出し {seat.withdrawTotal.toLocaleString()} / 購入 {seat.purchaseTotal.toLocaleString()}
            </p>
          }
        />

        <div className="grid grid-cols-2 gap-2">
          {(["add", "out"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setConfirming(false); }}
              className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                tab === t ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {t === "add" ? "チップ追加" : "退席"}
            </button>
          ))}
        </div>

        {tab === "add" ? (
          <BuyInForm key={seat.sessionId} user={seat.user} submitLabel="追加する" onSubmit={add} />
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">残チップ</label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={cashOut}
                onChange={(e) => { setCashOut(e.target.value); setConfirming(false); }}
                placeholder="卓に残っているチップ数"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-lg font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="rounded-lg border border-border px-3 py-2 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">持ち込み合計</span>
                <span className="font-mono">{buyIn.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">収支</span>
                <span
                  className="font-mono font-bold"
                  style={{ color: diff === null ? undefined : diff >= 0 ? "#22c55e" : "var(--destructive)" }}
                >
                  {diff === null ? "—" : `${diff >= 0 ? "+" : ""}${diff.toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">退席後の残高</span>
                <span className="font-mono">
                  {out === null ? "—" : (seat.user.chip_balance + out).toLocaleString()}
                </span>
              </div>
            </div>

            {confirming ? (
              <div className="space-y-2">
                <p className="text-center text-xs text-muted-foreground">
                  {out?.toLocaleString()} チップを残高に戻して退席します。よろしいですか？
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="rounded-lg border border-border py-3 text-sm text-muted-foreground"
                  >
                    戻る
                  </button>
                  <button
                    type="button"
                    onClick={seatOut}
                    disabled={loading}
                    className="rounded-lg bg-destructive py-3 text-sm font-bold text-white disabled:opacity-40"
                  >
                    {loading ? "処理中..." : "退席を確定"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={out === null}
                className="w-full rounded-lg bg-destructive py-3 text-sm font-bold text-white disabled:opacity-40 interactive"
              >
                退席する
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// レーキ記録
// ─────────────────────────────────────────────
export function RakeDialog({
  table,
  onClose,
  onDone,
}: {
  table: PokerTableState;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const n = toInt(amount);

  async function submit() {
    if (n <= 0) return;
    setLoading(true);
    try {
      await postJson("/api/admin/poker/rake", { tableId: table.id, amount: n });
      toast.success(`${table.name} のレーキ ${n.toLocaleString()} を記録しました`);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{table.name} レーキ記録</DialogTitle>
          <DialogDescription>管理チップ残高に加算されます</DialogDescription>
        </DialogHeader>
        <ChipAmountField label="レーキ" value={amount} onChange={setAmount} />
        <button
          type="button"
          onClick={submit}
          disabled={n <= 0 || loading}
          className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40 interactive"
        >
          {loading ? "処理中..." : "記録する"}
        </button>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// 卓の設定（マスターのみ）
// ─────────────────────────────────────────────
export function TableSettingsDialog({
  tables,
  onClose,
  onChanged,
}: {
  tables: PokerTableState[];
  onClose: () => void;
  onChanged: () => void;
}) {
  // 未編集のテーブルは現在名を表示（追加直後のテーブルにも対応）
  const [names, setNames] = useState<Record<string, string>>({});
  const nameOf = (t: PokerTableState) => names[t.id] ?? t.name;
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<unknown>, success: string) {
    setBusy(key);
    try {
      await fn();
      toast.success(success);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>テーブル設定</DialogTitle>
          <DialogDescription>各テーブルは P1〜P10 の10席です</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {tables.map((t) => (
            <div key={t.id} className="flex items-center gap-2">
              <input
                value={nameOf(t)}
                onChange={(e) => setNames((n) => ({ ...n, [t.id]: e.target.value }))}
                maxLength={20}
                className={`min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm ${t.isActive ? "" : "opacity-50"}`}
              />
              <button
                type="button"
                disabled={busy !== null || !nameOf(t).trim() || nameOf(t) === t.name}
                onClick={() => run(t.id, () => postJson(`/api/admin/poker/tables/${t.id}`, { name: nameOf(t) }, "PATCH"), "テーブル名を変更しました")}
                className="rounded-lg border border-border px-2.5 py-2 text-xs disabled:opacity-30"
              >
                保存
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => run(t.id, () => postJson(`/api/admin/poker/tables/${t.id}`, { isActive: !t.isActive }, "PATCH"), t.isActive ? "テーブルを停止しました" : "テーブルを再開しました")}
                className="rounded-lg px-2.5 py-2 text-xs text-muted-foreground hover:bg-muted disabled:opacity-30"
              >
                {t.isActive ? "停止" : "再開"}
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t border-border pt-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={20}
            placeholder="新しいテーブル名"
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={busy !== null || !newName.trim()}
            onClick={() => run("new", async () => { await postJson("/api/admin/poker/tables", { name: newName }); setNewName(""); }, "テーブルを追加しました")}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40"
          >
            追加
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
