"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Filter, Send, Users as UsersIcon, X } from "lucide-react";

interface Template {
  id: string;
  name: string;
  subtitle: string | null;
  image_url: string | null;
  valid_days: number;
  point_cost: number | null;
  is_active: boolean;
}

interface Rank {
  id: string;
  name: string;
  display_order: number;
}

interface FilteredUser {
  id: string;
  nickname: string;
  chip_balance: number;
  point_balance: number;
  total_visit_count: number;
  rank_name: string | null;
  gender: "male" | "female" | "other" | null;
  last_visit_at: string | null;
  created_at: string;
}

export function CouponSegmentIssue({ templates, ranks }: { templates: Template[]; ranks: Rank[] }) {
  const router = useRouter();
  const [filters, setFilters] = useState({
    search: "",
    visitMin: "", visitMax: "",
    chipMin: "", chipMax: "",
    pointMin: "", pointMax: "",
    rankIds: [] as string[],
    gender: "" as "" | "male" | "female" | "other",
    registeredAfter: "", registeredBefore: "",
    lastVisitAfter: "", lastVisitBefore: "",
  });
  const [users, setUsers] = useState<FilteredUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [templateId, setTemplateId] = useState<string>(templates[0]?.id ?? "");
  const [issuing, setIssuing] = useState(false);

  function toggleRank(id: string) {
    setFilters((f) => ({
      ...f,
      rankIds: f.rankIds.includes(id) ? f.rankIds.filter((r) => r !== id) : [...f.rankIds, id],
    }));
  }

  async function search() {
    setSearching(true);
    try {
      const payload: Record<string, unknown> = { search: filters.search.trim() };
      if (filters.visitMin) payload.visitMin = parseInt(filters.visitMin, 10);
      if (filters.visitMax) payload.visitMax = parseInt(filters.visitMax, 10);
      if (filters.chipMin) payload.chipMin = parseInt(filters.chipMin, 10);
      if (filters.chipMax) payload.chipMax = parseInt(filters.chipMax, 10);
      if (filters.pointMin) payload.pointMin = parseInt(filters.pointMin, 10);
      if (filters.pointMax) payload.pointMax = parseInt(filters.pointMax, 10);
      if (filters.rankIds.length) payload.rankIds = filters.rankIds;
      if (filters.gender) payload.gender = filters.gender;
      if (filters.registeredAfter) payload.registeredAfter = new Date(filters.registeredAfter).toISOString();
      if (filters.registeredBefore) payload.registeredBefore = new Date(filters.registeredBefore + "T23:59:59").toISOString();
      if (filters.lastVisitAfter) payload.lastVisitAfter = new Date(filters.lastVisitAfter).toISOString();
      if (filters.lastVisitBefore) payload.lastVisitBefore = new Date(filters.lastVisitBefore + "T23:59:59").toISOString();

      const res = await fetch("/api/admin/users/segment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "検索失敗"); return; }
      setUsers(data.users);
      setSelectedUsers(new Set(data.users.map((u: FilteredUser) => u.id)));
      setSearched(true);
    } finally {
      setSearching(false);
    }
  }

  function toggleUser(id: string) {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedUsers(new Set(users.map((u) => u.id)));
  }
  function selectNone() {
    setSelectedUsers(new Set());
  }

  async function issue() {
    if (!templateId) { toast.error("テンプレートを選択してください"); return; }
    if (selectedUsers.size === 0) { toast.error("対象ユーザーを選択してください"); return; }

    if (!confirm(`${selectedUsers.size} 名にクーポンを配布します。よろしいですか？`)) return;

    setIssuing(true);
    try {
      const res = await fetch("/api/admin/coupons/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [...selectedUsers], templateId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "発行失敗"); return; }
      toast.success(`${data.issued} 件のクーポンを発行しました`);
      setSelectedUsers(new Set());
      router.refresh();
    } finally {
      setIssuing(false);
    }
  }

  const selectedTemplate = templates.find((t) => t.id === templateId);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Filter size={16} style={{ color: "var(--primary)" }} />
          <h3 className="text-sm font-semibold">セグメント検索</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="ニックネーム / ID 検索">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text" value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="部分一致"
                className="w-full rounded-lg border border-border bg-input pl-9 pr-3 py-2 text-sm"
              />
            </div>
          </Field>

          <Field label="性別">
            <select
              value={filters.gender}
              onChange={(e) => setFilters({ ...filters, gender: e.target.value as typeof filters.gender })}
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
            >
              <option value="">すべて</option>
              <option value="male">男性</option>
              <option value="female">女性</option>
              <option value="other">その他</option>
            </select>
          </Field>

          <RangeField label="来店回数" min={filters.visitMin} max={filters.visitMax}
            onChange={(min, max) => setFilters({ ...filters, visitMin: min, visitMax: max })} />
          <RangeField label="チップ残高" min={filters.chipMin} max={filters.chipMax}
            onChange={(min, max) => setFilters({ ...filters, chipMin: min, chipMax: max })} />
          <RangeField label="ポイント残高" min={filters.pointMin} max={filters.pointMax}
            onChange={(min, max) => setFilters({ ...filters, pointMin: min, pointMax: max })} />

          <Field label="登録日 (期間)">
            <div className="flex gap-1.5 items-center">
              <input type="date" value={filters.registeredAfter}
                onChange={(e) => setFilters({ ...filters, registeredAfter: e.target.value })}
                className="flex-1 rounded-lg border border-border bg-input px-2 py-2 text-xs" />
              <span className="text-xs text-muted-foreground">〜</span>
              <input type="date" value={filters.registeredBefore}
                onChange={(e) => setFilters({ ...filters, registeredBefore: e.target.value })}
                className="flex-1 rounded-lg border border-border bg-input px-2 py-2 text-xs" />
            </div>
          </Field>

          <Field label="最終来店 (期間)">
            <div className="flex gap-1.5 items-center">
              <input type="date" value={filters.lastVisitAfter}
                onChange={(e) => setFilters({ ...filters, lastVisitAfter: e.target.value })}
                className="flex-1 rounded-lg border border-border bg-input px-2 py-2 text-xs" />
              <span className="text-xs text-muted-foreground">〜</span>
              <input type="date" value={filters.lastVisitBefore}
                onChange={(e) => setFilters({ ...filters, lastVisitBefore: e.target.value })}
                className="flex-1 rounded-lg border border-border bg-input px-2 py-2 text-xs" />
            </div>
          </Field>
        </div>

        <Field label="ランク（複数選択可）">
          <div className="flex flex-wrap gap-1.5">
            {ranks.map((r) => {
              const active = filters.rankIds.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleRank(r.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    active ? "text-white border-primary" : "border-border text-muted-foreground"
                  }`}
                  style={active ? { background: "var(--primary)" } : undefined}
                >
                  {r.name}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="flex justify-end pt-1">
          <button
            onClick={search}
            disabled={searching}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold text-white interactive disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            <Search size={14} />
            {searching ? "検索中..." : "検索"}
          </button>
        </div>
      </div>

      {/* Results */}
      {searched && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <div className="flex items-center gap-2">
              <UsersIcon size={14} style={{ color: "var(--primary)" }} />
              <p className="text-sm">
                <span className="font-bold">{users.length}</span>
                <span className="text-muted-foreground"> 件ヒット / </span>
                <span className="font-bold" style={{ color: "var(--primary)" }}>{selectedUsers.size}</span>
                <span className="text-muted-foreground"> 件選択中</span>
              </p>
            </div>
            <div className="flex gap-1.5">
              <button onClick={selectAll} className="text-xs text-muted-foreground hover:text-foreground">全選択</button>
              <span className="text-muted-foreground">/</span>
              <button onClick={selectNone} className="text-xs text-muted-foreground hover:text-foreground">解除</button>
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {users.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">該当ユーザーがいません</p>
            )}
            {users.map((u) => {
              const sel = selectedUsers.has(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => toggleUser(u.id)}
                  className={`w-full px-3 py-2.5 flex items-center gap-3 border-b border-border text-left hover:bg-muted/30 transition-colors ${sel ? "bg-primary/10" : ""}`}
                >
                  <div className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: sel ? "var(--primary)" : "var(--border)", background: sel ? "var(--primary)" : "transparent" }}>
                    {sel && <span className="text-white text-[10px]">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.nickname}</p>
                    <div className="flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
                      {u.rank_name && <span>{u.rank_name}</span>}
                      <span>来店{u.total_visit_count}回</span>
                      <span>{u.chip_balance.toLocaleString()}chip</span>
                      <span>{u.point_balance.toLocaleString()}pt</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Template select & issue */}
      {searched && users.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">配布テンプレート</h3>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
          >
            <option value="">テンプレートを選択</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}{t.subtitle ? ` — ${t.subtitle}` : ""}</option>
            ))}
          </select>

          {selectedTemplate && (
            <div className="flex gap-3 rounded-lg border border-border bg-muted/20 p-3">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted/40 flex-shrink-0 flex items-center justify-center">
                {selectedTemplate.image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={selectedTemplate.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <X size={20} className="text-muted-foreground" />
                )}
              </div>
              <div className="text-sm">
                <p className="font-bold">{selectedTemplate.name}</p>
                {selectedTemplate.subtitle && <p className="text-xs text-muted-foreground">{selectedTemplate.subtitle}</p>}
                <p className="text-xs text-muted-foreground mt-0.5">有効{selectedTemplate.valid_days}日間</p>
              </div>
            </div>
          )}

          <button
            onClick={issue}
            disabled={issuing || selectedUsers.size === 0 || !templateId}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-black text-white interactive disabled:opacity-40"
            style={{
              background: "var(--primary)",
              boxShadow: "0 0 14px oklch(0.65 0.26 22 / 35%)",
            }}
          >
            <Send size={16} />
            {issuing ? "配布中..." : `${selectedUsers.size} 名に配布`}
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function RangeField({
  label, min, max, onChange,
}: {
  label: string; min: string; max: string; onChange: (min: string, max: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-1.5 items-center">
        <input type="number" value={min} onChange={(e) => onChange(e.target.value, max)} placeholder="最小"
          className="flex-1 rounded-lg border border-border bg-input px-2 py-2 text-xs" />
        <span className="text-xs text-muted-foreground">〜</span>
        <input type="number" value={max} onChange={(e) => onChange(min, e.target.value)} placeholder="最大"
          className="flex-1 rounded-lg border border-border bg-input px-2 py-2 text-xs" />
      </div>
    </Field>
  );
}
