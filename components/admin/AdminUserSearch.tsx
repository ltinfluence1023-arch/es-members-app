"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

interface UserRow {
  id: string;
  nickname: string;
  chip_balance: number;
  point_balance: number;
  ranks: { name: string } | null;
  created_at: string;
}

export function AdminUserSearch({ users }: { users: UserRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? users.filter((u) =>
        u.nickname.toLowerCase().includes(query.toLowerCase()) ||
        u.id.toLowerCase().includes(query.toLowerCase())
      )
    : users;

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ニックネーム / ID で検索"
          className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
          >
            ✕
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} 件</p>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="py-2 px-4 text-left text-xs text-muted-foreground">ニックネーム</th>
              <th className="py-2 px-4 text-right text-xs text-muted-foreground">チップ</th>
              <th className="py-2 px-4 text-right text-xs text-muted-foreground">ポイント</th>
              <th className="py-2 px-4 text-left text-xs text-muted-foreground">ランク</th>
              <th className="py-2 px-4 text-left text-xs text-muted-foreground">登録日</th>
              <th className="py-2 px-4" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  該当するユーザーが見つかりません
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="py-3 px-4 font-medium">{u.nickname}</td>
                  <td className="py-3 px-4 text-right font-mono" style={{ color: "var(--chip)" }}>
                    {u.chip_balance.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono" style={{ color: "var(--point)" }}>
                    {u.point_balance.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{u.ranks?.name ?? "-"}</td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">
                    {new Date(u.created_at).toLocaleDateString("ja-JP")}
                  </td>
                  <td className="py-3 px-4">
                    <Link href={`/admin/customers/${u.id}`} className="text-xs text-primary hover:underline">
                      詳細
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
