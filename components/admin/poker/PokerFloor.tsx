"use client";

import { useCallback, useEffect, useState } from "react";
import { Coins, RefreshCw, Settings } from "lucide-react";
import type { PokerSeatState, PokerTableState } from "@/lib/admin/poker";
import { PokerTableView } from "./PokerTableView";
import { RakeDialog, SeatActionDialog, SeatInDialog, TableSettingsDialog } from "./PokerDialogs";

// 複数ディーラーが同時に操作しても表示が揃うよう定期的に再取得する
const POLL_MS = 10_000;

type Modal =
  | { kind: "seat-in"; seatNo: number }
  | { kind: "seat"; seat: PokerSeatState }
  | { kind: "rake" }
  | { kind: "settings" }
  | null;

export function PokerFloor({ initialTables, isMaster }: { initialTables: PokerTableState[]; isMaster: boolean }) {
  const [tables, setTables] = useState(initialTables);
  const [tableId, setTableId] = useState(initialTables.find((t) => t.isActive)?.id ?? null);
  const [modal, setModal] = useState<Modal>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/poker", { cache: "no-store" });
      if (res.ok) setTables((await res.json()).tables);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const activeTables = tables.filter((t) => t.isActive);
  const table = activeTables.find((t) => t.id === tableId) ?? activeTables[0] ?? null;

  function done() {
    setModal(null);
    refresh();
  }

  return (
    <div className="space-y-4">
      {/* テーブル切り替え + 操作 */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1.5 overflow-x-auto">
          {activeTables.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTableId(t.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                t.id === table?.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {t.name}
              <span className="ml-1.5 opacity-70">{t.seats.length}/{t.seatCount}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={refresh}
          aria-label="更新"
          className="rounded-full p-2 text-muted-foreground hover:bg-muted"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
        </button>
        {isMaster && (
          <button
            type="button"
            onClick={() => setModal({ kind: "settings" })}
            aria-label="テーブル設定"
            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
          >
            <Settings size={16} />
          </button>
        )}
      </div>

      {table ? (
        <>
          <PokerTableView
            table={table}
            onSeatClick={(seatNo, seat) => setModal(seat ? { kind: "seat", seat } : { kind: "seat-in", seatNo })}
          />

          <button
            type="button"
            onClick={() => setModal({ kind: "rake" })}
            className="mx-auto flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted interactive"
          >
            <Coins size={16} style={{ color: "var(--chip)" }} />
            レーキを記録
          </button>
        </>
      ) : (
        <p className="py-16 text-center text-sm text-muted-foreground">
          使用中のテーブルがありません{isMaster ? "。右上の設定から追加してください" : ""}
        </p>
      )}

      {table && modal?.kind === "seat-in" && (
        <SeatInDialog table={table} seatNo={modal.seatNo} onClose={() => setModal(null)} onDone={done} />
      )}
      {table && modal?.kind === "seat" && (
        <SeatActionDialog table={table} seat={modal.seat} onClose={() => setModal(null)} onDone={done} />
      )}
      {table && modal?.kind === "rake" && (
        <RakeDialog table={table} onClose={() => setModal(null)} onDone={done} />
      )}
      {modal?.kind === "settings" && (
        <TableSettingsDialog tables={tables} onClose={() => setModal(null)} onChanged={refresh} />
      )}
    </div>
  );
}
