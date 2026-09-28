"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, FileUp, Loader2 } from "lucide-react";
import { decodeCsvBytes, toCsv } from "@/lib/utils/csv";
import { parseQuizCsv, QUIZ_CSV_HEADER, QUIZ_CSV_MAX_ROWS, type QuizCsvRow } from "@/lib/utils/quizCsv";

const TEMPLATE_ROWS = [
  QUIZ_CSV_HEADER,
  ["flair bar es があるのはどこ？", "札幌", "函館", "旭川", "小樽", "A"],
  ["ポーカーで最も強い役は？", "フォーカード", "ロイヤルフラッシュ", "フルハウス", "ストレート", "B"],
];

export function QuizCsvImport({ onImported }: { onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<QuizCsvRow[]>([]);
  const [importing, setImporting] = useState(false);

  const errors = rows.filter((r) => r.error);
  const valid = rows.filter((r) => !r.error);
  const tooMany = rows.length > QUIZ_CSV_MAX_ROWS;

  function downloadTemplate() {
    // Excel で文字化けしないよう BOM 付き UTF-8 で出力
    const blob = new Blob(["﻿" + toCsv(TEMPLATE_ROWS)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quiz_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    const text = decodeCsvBytes(await file.arrayBuffer());
    const parsed = parseQuizCsv(text);
    setRows(parsed);
    if (parsed.length === 0) toast.error("問題が見つかりませんでした");
  }

  async function importRows() {
    setImporting(true);
    try {
      const res = await fetch("/api/admin/quiz/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: valid.map(({ question, option_a, option_b, option_c, option_d, correct_option }) => ({
            question, option_a, option_b, option_c, option_d, correct_option,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${data.inserted}問を登録しました${data.skipped ? `（重複 ${data.skipped}問はスキップ）` : ""}`);
      setRows([]);
      setFileName(null);
      if (fileRef.current) fileRef.current.value = "";
      onImported();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="card-elevated rounded-2xl p-5 space-y-4 animate-scale-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black">CSVで一括登録</p>
          <p className="mt-1 text-xs text-muted-foreground">
            列の順番: 問題文 / 選択肢A / 選択肢B / 選択肢C / 選択肢D / 正解（A〜D）。1行目の見出しはあってもなくても構いません。
            Excel で保存したCSV（Shift_JIS）も読み込めます。同じ問題文は登録済みでもCSV内でも重複として読み飛ばします。
          </p>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted"
        >
          <Download size={13} />
          テンプレート
        </button>
      </div>

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-6 text-sm text-muted-foreground hover:bg-muted/40">
        <FileUp size={18} />
        {fileName ?? "CSVファイルを選択"}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </label>

      {rows.length > 0 && (
        <>
          <div className="flex flex-wrap gap-3 text-xs">
            <span>読み込み <b>{rows.length}</b>問</span>
            <span className="text-muted-foreground">登録可能 <b className="text-foreground">{valid.length}</b>問</span>
            {errors.length > 0 && <span className="text-destructive">エラー {errors.length}行（登録されません）</span>}
          </div>

          <div className="max-h-80 overflow-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-2 py-2 text-left font-medium">行</th>
                  <th className="px-2 py-2 text-left font-medium">問題文</th>
                  <th className="px-2 py-2 text-left font-medium">選択肢</th>
                  <th className="px-2 py-2 text-left font-medium">正解</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.line} className={`border-b border-border last:border-0 align-top ${r.error ? "bg-destructive/10" : ""}`}>
                    <td className="px-2 py-1.5 font-mono text-muted-foreground">{r.line}</td>
                    <td className="px-2 py-1.5">
                      {r.question || "—"}
                      {r.error && <p className="text-destructive">{r.error}</p>}
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">
                      A {r.option_a} / B {r.option_b} / C {r.option_c} / D {r.option_d}
                    </td>
                    <td className="px-2 py-1.5 font-bold">{r.correct_option?.toUpperCase() ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {tooMany && (
            <p className="text-xs text-destructive">一度に登録できるのは{QUIZ_CSV_MAX_ROWS}問までです。ファイルを分けてください。</p>
          )}

          <button
            type="button"
            onClick={importRows}
            disabled={importing || valid.length === 0 || tooMany}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white interactive disabled:opacity-40"
            style={{ background: "var(--primary)" }}
          >
            {importing && <Loader2 size={15} className="animate-spin" />}
            {valid.length}問を登録する
          </button>
        </>
      )}
    </div>
  );
}
