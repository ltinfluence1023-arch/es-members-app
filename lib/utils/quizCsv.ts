import { parseCsv } from "@/lib/utils/csv";

/** クイズCSVの列: 問題文, 選択肢A, 選択肢B, 選択肢C, 選択肢D, 正解(A〜D) */
export const QUIZ_CSV_HEADER = ["問題文", "選択肢A", "選択肢B", "選択肢C", "選択肢D", "正解"];
export const QUIZ_CSV_MAX_ROWS = 500;

export type QuizCsvRow = {
  line: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "a" | "b" | "c" | "d" | null;
  error: string | null;
};

const CORRECT_MAP: Record<string, "a" | "b" | "c" | "d"> = {
  a: "a", b: "b", c: "c", d: "d",
  "1": "a", "2": "b", "3": "c", "4": "d",
  ａ: "a", ｂ: "b", ｃ: "c", ｄ: "d",
  "１": "a", "２": "b", "３": "c", "４": "d",
};

export function normalizeCorrect(v: string): "a" | "b" | "c" | "d" | null {
  return CORRECT_MAP[v.trim().toLowerCase()] ?? null;
}

/** 1行目が見出し（正解列が A〜D でない）なら読み飛ばす */
export function parseQuizCsv(text: string): QuizCsvRow[] {
  const rows = parseCsv(text);
  const hasHeader = rows.length > 0 && normalizeCorrect(rows[0][5] ?? "") === null;
  const body = hasHeader ? rows.slice(1) : rows;
  const offset = hasHeader ? 2 : 1;

  return body.map((cells, i) => {
    const [question = "", a = "", b = "", c = "", d = "", correct = ""] = cells.map((v) => v.trim());
    const correct_option = normalizeCorrect(correct);
    let error: string | null = null;
    if (cells.length < 6) error = "列が足りません（6列必要）";
    else if (!question) error = "問題文が空です";
    else if (!a || !b || !c || !d) error = "選択肢が空です";
    else if (!correct_option) error = "正解は A〜D で入力してください";
    return { line: i + offset, question, option_a: a, option_b: b, option_c: c, option_d: d, correct_option, error };
  });
}
