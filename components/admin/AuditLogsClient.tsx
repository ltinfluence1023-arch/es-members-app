"use client";

import { useMemo, useState } from "react";
import { Filter, Search } from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  category: string;
  summary: string | null;
  target_label: string | null;
  actor_id: string | null;
  actor_name: string | null;
  ip_address: string | null;
  created_at: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  auth: "認証",
  coupon: "クーポン",
  customer: "顧客",
  fee: "手数料",
  chip: "チップ",
  point: "ポイント",
  staff: "スタッフ",
  notice: "お知らせ",
  other: "その他",
};

const CATEGORY_COLOR: Record<string, string> = {
  auth: "#60a5fa",
  coupon: "#fbbf24",
  customer: "var(--primary)",
  fee: "var(--chip)",
  chip: "var(--chip)",
  point: "var(--point)",
  staff: "#a78bfa",
  notice: "#34d399",
  other: "var(--muted-foreground)",
};

function fmtJST(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export function AuditLogsClient({ initialLogs }: { initialLogs: AuditLog[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");

  const filtered = useMemo(() => {
    let r = initialLogs;
    if (category) r = r.filter((l) => l.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((l) =>
        (l.summary ?? "").toLowerCase().includes(q) ||
        (l.actor_name ?? "").toLowerCase().includes(q) ||
        (l.target_label ?? "").toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q)
      );
    }
    return r;
  }, [initialLogs, search, category]);

  // Group by date (JST)
  const groups = useMemo(() => {
    const map = new Map<string, AuditLog[]>();
    for (const l of filtered) {
      const d = new Date(l.created_at);
      const jst = new Date(d.getTime() + 9 * 3600 * 1000);
      const dateKey = `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}-${String(jst.getUTCDate()).padStart(2, "0")}`;
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(l);
    }
    return [...map.entries()];
  }, [filtered]);

  const categories = Array.from(new Set(initialLogs.map((l) => l.category)));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="検索（操作内容・担当者）"
            className="w-full rounded-lg border border-border bg-input pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter size={13} className="text-muted-foreground" />
          <button
            onClick={() => setCategory("")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              category === "" ? "text-white border-primary" : "border-border text-muted-foreground"
            }`}
            style={category === "" ? { background: "var(--primary)" } : undefined}
          >
            すべて
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                category === c ? "text-white border-primary" : "border-border text-muted-foreground"
              }`}
              style={category === c ? { background: "var(--primary)" } : undefined}
            >
              {CATEGORY_LABEL[c] ?? c}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} 件 / 全 {initialLogs.length} 件</p>

      {/* Logs grouped by date */}
      <div className="space-y-4">
        {groups.map(([date, logs]) => (
          <div key={date} className="rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/40 flex items-center justify-between">
              <p className="text-sm font-bold font-mono">{date}</p>
              <p className="text-xs text-muted-foreground">{logs.length} 件</p>
            </div>
            <div className="divide-y divide-border">
              {logs.map((l) => (
                <div key={l.id} className="px-4 py-2.5 hover:bg-muted/20">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide"
                        style={{
                          background: `${CATEGORY_COLOR[l.category] ?? "var(--muted)"}22`,
                          color: CATEGORY_COLOR[l.category] ?? "var(--muted-foreground)",
                        }}
                      >
                        {CATEGORY_LABEL[l.category] ?? l.category}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-tight">{l.summary ?? l.action}</p>
                      <div className="flex flex-wrap gap-x-3 mt-1 text-[11px] text-muted-foreground">
                        <span className="font-mono">{fmtJST(l.created_at).slice(11)}</span>
                        {l.actor_name && (
                          <span>by <span className="text-foreground font-medium">{l.actor_name}</span></span>
                        )}
                        {l.target_label && <span>→ {l.target_label}</span>}
                        {l.ip_address && <span className="font-mono opacity-60">{l.ip_address}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
            ログがありません
          </div>
        )}
      </div>
    </div>
  );
}
