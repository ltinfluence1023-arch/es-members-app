"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Loader2, HelpCircle } from "lucide-react";

interface Question {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
}

interface QuizState {
  question: Question | null;
  answered: boolean;
  result: {
    correct: boolean;
    selected: string;
    correctOption: string;
  } | null;
}

const OPTION_KEYS = ["a", "b", "c", "d"] as const;
const OPTION_LABELS: Record<string, string> = { a: "A", b: "B", c: "C", d: "D" };

function getOptionText(q: Question, key: string): string {
  return { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d }[key] ?? "";
}

export function DailyQuizClient() {
  const [state, setState]   = useState<QuizState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/quiz/today")
      .then((r) => r.json())
      .then(setState)
      .catch(() => setState(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit() {
    if (!selected || !state?.question || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: state.question.id, selected_option: selected }),
      });
      const json = await res.json();
      setState((prev) =>
        prev ? {
          ...prev,
          answered: true,
          result: { correct: json.correct, selected, correctOption: json.correctOption },
        } : prev
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ── 読み込み中 ──
  if (loading) {
    return (
      <div className="card-elevated rounded-2xl p-8 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  // ── 問題なし ──
  if (!state?.question) {
    return (
      <div className="card-elevated rounded-2xl p-8 text-center space-y-2">
        <HelpCircle size={32} className="mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">本日の問題はまだ準備中です</p>
        <p className="text-xs text-muted-foreground">管理者がクイズ問題を追加すると表示されます</p>
      </div>
    );
  }

  const { question: q, answered, result } = state;

  // ── 回答済み ──
  if (answered && result) {
    return (
      <div className="space-y-4 animate-scale-in">
        {/* 結果バナー */}
        <div
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{
            background: result.correct
              ? "linear-gradient(135deg, oklch(0.20 0.06 145) 0%, oklch(0.14 0.04 145) 100%)"
              : "linear-gradient(135deg, oklch(0.20 0.06 22) 0%, oklch(0.14 0.04 22) 100%)",
            border: `1px solid ${result.correct ? "oklch(0.55 0.18 145 / 40%)" : "oklch(0.63 0.26 22 / 40%)"}`,
            boxShadow: result.correct
              ? "0 0 24px oklch(0.55 0.18 145 / 20%)"
              : "0 0 24px oklch(0.63 0.26 22 / 20%)",
          }}
        >
          {result.correct
            ? <CheckCircle size={36} style={{ color: "oklch(0.72 0.22 145)", flexShrink: 0 }} />
            : <XCircle    size={36} style={{ color: "oklch(0.63 0.26 22)", flexShrink: 0 }} />}
          <div>
            <p className="font-black text-lg leading-tight">
              {result.correct ? "正解！" : "残念…"}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {result.correct
                ? "+10チップ獲得しました 🎉"
                : `正解は「${OPTION_LABELS[result.correctOption]}」でした`}
            </p>
          </div>
        </div>

        {/* 問題と各選択肢（正誤色分け） */}
        <div className="card-elevated rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold leading-relaxed">{q.question}</p>
          <div className="space-y-2">
            {OPTION_KEYS.map((key) => {
              const isCorrect  = key === result.correctOption;
              const isSelected = key === result.selected;
              return (
                <div
                  key={key}
                  className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{
                    background: isCorrect
                      ? "oklch(0.55 0.18 145 / 18%)"
                      : isSelected && !isCorrect
                        ? "oklch(0.63 0.26 22 / 18%)"
                        : "oklch(1 0 0 / 4%)",
                    border: `1px solid ${
                      isCorrect ? "oklch(0.55 0.18 145 / 40%)"
                      : isSelected ? "oklch(0.63 0.26 22 / 40%)"
                      : "oklch(1 0 0 / 10%)"}`,
                  }}
                >
                  <span
                    className="text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: isCorrect
                        ? "oklch(0.55 0.18 145)"
                        : isSelected ? "oklch(0.63 0.26 22)"
                        : "oklch(1 0 0 / 12%)",
                      color: isCorrect || isSelected ? "white" : "var(--muted-foreground)",
                    }}
                  >
                    {OPTION_LABELS[key]}
                  </span>
                  <span className="text-sm flex-1">{getOptionText(q, key)}</span>
                  {isCorrect && <CheckCircle size={14} style={{ color: "oklch(0.72 0.22 145)" }} />}
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">明日またチャレンジしよう！</p>
      </div>
    );
  }

  // ── 未回答 ──
  return (
    <div className="space-y-4">
      <div className="card-elevated rounded-2xl p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: "var(--primary)", boxShadow: "var(--shadow-neon)" }}
          >
            <HelpCircle size={16} className="text-white" />
          </div>
          <p className="text-[15px] font-bold leading-relaxed flex-1">{q.question}</p>
        </div>
      </div>

      {/* 選択肢 */}
      <div className="space-y-2.5">
        {OPTION_KEYS.map((key) => {
          const isChosen = selected === key;
          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className="w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-left interactive"
              style={{
                background: isChosen
                  ? "oklch(0.63 0.26 22 / 20%)"
                  : "oklch(0.145 0.016 22)",
                border: `1px solid ${isChosen ? "oklch(0.63 0.26 22 / 60%)" : "oklch(1 0 0 / 14%)"}`,
                boxShadow: isChosen ? "var(--shadow-neon)" : undefined,
                transition: "all 0.18s ease",
              }}
            >
              <span
                className="text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: isChosen ? "var(--primary)" : "oklch(1 0 0 / 12%)",
                  color: isChosen ? "white" : "var(--muted-foreground)",
                  boxShadow: isChosen ? "0 0 8px oklch(0.65 0.26 22 / 60%)" : undefined,
                }}
              >
                {OPTION_LABELS[key]}
              </span>
              <span className="text-sm font-medium flex-1">{getOptionText(q, key)}</span>
            </button>
          );
        })}
      </div>

      {/* 回答ボタン */}
      <button
        onClick={handleSubmit}
        disabled={!selected || submitting}
        className="w-full rounded-2xl py-3.5 font-black text-sm text-white interactive"
        style={{
          background: selected
            ? "linear-gradient(135deg, var(--primary) 0%, oklch(0.55 0.24 22) 100%)"
            : "oklch(1 0 0 / 10%)",
          boxShadow: selected ? "var(--shadow-neon)" : undefined,
          color: selected ? "white" : "var(--muted-foreground)",
          cursor: selected ? "pointer" : "not-allowed",
          transition: "all 0.2s ease",
          letterSpacing: "0.05em",
        }}
      >
        {submitting
          ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> 送信中...</span>
          : "回答する"}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        ※ 回答は1日1回のみです
      </p>
    </div>
  );
}
