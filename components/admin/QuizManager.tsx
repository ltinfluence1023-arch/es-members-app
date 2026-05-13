"use client";

import { useState } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface Question {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  is_active: boolean;
  created_at: string;
}

const OPTION_KEYS = ["a", "b", "c", "d"] as const;
const OPTION_LABELS: Record<string, string> = { a: "A", b: "B", c: "C", d: "D" };

const EMPTY_FORM = {
  question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "a",
};

export function QuizManager({ initialQuestions }: { initialQuestions: Question[] }) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);

  async function handleCreate() {
    if (!form.question || !form.option_a || !form.option_b || !form.option_c || !form.option_d) {
      setError("すべての項目を入力してください");
      return;
    }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/admin/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { setError((await res.json()).error); return; }
      const created: Question = await res.json();
      setQuestions((prev) => [created, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(q: Question) {
    const res = await fetch(`/api/admin/quiz/${q.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !q.is_active }),
    });
    if (res.ok) {
      const updated: Question = await res.json();
      setQuestions((prev) => prev.map((x) => x.id === q.id ? updated : x));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("この問題を削除しますか？")) return;
    const res = await fetch(`/api/admin/quiz/${id}`, { method: "DELETE" });
    if (res.ok) setQuestions((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black heading-gaming">デイリークイズ管理</h1>
          <p className="text-xs text-muted-foreground mt-1">
            毎日ランダムに1問が出題されます（有効な問題から選択）
          </p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setError(null); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-white interactive"
          style={{ background: "var(--primary)", boxShadow: "var(--shadow-neon)" }}
        >
          <Plus size={16} />
          問題追加
        </button>
      </div>

      {/* 作成フォーム */}
      {showForm && (
        <div className="card-elevated rounded-2xl p-5 space-y-4 animate-scale-in">
          <p className="text-sm font-black">新しい問題を作成</p>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">問題文</label>
              <textarea
                className="w-full rounded-lg bg-secondary border border-border text-sm px-3 py-2.5 resize-none focus:outline-none focus:border-primary"
                rows={3}
                placeholder="例: flair bar esがオープンしたのはいつですか？"
                value={form.question}
                onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {OPTION_KEYS.map((key) => (
                <div key={key}>
                  <label className="text-xs text-muted-foreground mb-1 block">選択肢 {OPTION_LABELS[key]}</label>
                  <input
                    className="w-full rounded-lg bg-secondary border border-border text-sm px-3 py-2 focus:outline-none focus:border-primary"
                    placeholder={`選択肢${OPTION_LABELS[key]}`}
                    value={form[`option_${key}` as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [`option_${key}`]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">正解</label>
              <div className="flex gap-2">
                {OPTION_KEYS.map((key) => (
                  <button
                    key={key}
                    onClick={() => setForm((f) => ({ ...f, correct_option: key }))}
                    className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                    style={{
                      background: form.correct_option === key ? "var(--primary)" : "var(--secondary)",
                      color: form.correct_option === key ? "white" : "var(--muted-foreground)",
                      boxShadow: form.correct_option === key ? "var(--shadow-neon)" : undefined,
                    }}
                  >
                    {OPTION_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white interactive"
              style={{ background: "var(--primary)" }}
            >
              {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : "作成する"}
            </button>
            <button
              onClick={() => { setShowForm(false); setError(null); setForm(EMPTY_FORM); }}
              className="px-4 py-2.5 rounded-xl text-sm font-bold bg-secondary text-foreground interactive"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 問題一覧 */}
      {questions.length === 0 ? (
        <div className="card-elevated rounded-2xl p-8 text-center text-sm text-muted-foreground">
          問題がまだありません。「問題追加」から作成してください。
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((q) => (
            <div
              key={q.id}
              className="card-elevated rounded-xl overflow-hidden"
              style={{ opacity: q.is_active ? 1 : 0.55 }}
            >
              {/* 問題ヘッダー */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: q.is_active ? "#4ade80" : "var(--muted-foreground)" }}
                />
                <p className="text-sm font-bold flex-1 truncate">{q.question}</p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* 有効/無効トグル */}
                  <button
                    onClick={() => handleToggleActive(q)}
                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                    title={q.is_active ? "無効にする" : "有効にする"}
                  >
                    {q.is_active
                      ? <ToggleRight size={20} style={{ color: "#4ade80" }} />
                      : <ToggleLeft  size={20} className="text-muted-foreground" />}
                  </button>
                  {/* 展開 */}
                  <button
                    onClick={() => setExpandedId((id) => id === q.id ? null : q.id)}
                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                  >
                    {expandedId === q.id
                      ? <ChevronUp size={16} className="text-muted-foreground" />
                      : <ChevronDown size={16} className="text-muted-foreground" />}
                  </button>
                  {/* 削除 */}
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 size={16} className="text-destructive" />
                  </button>
                </div>
              </div>

              {/* 展開: 選択肢 */}
              {expandedId === q.id && (
                <div className="border-t border-border px-4 py-3 space-y-1.5 bg-secondary/30">
                  {OPTION_KEYS.map((key) => {
                    const isCorrect = key === q.correct_option;
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: isCorrect ? "#4ade80" : "var(--secondary)",
                            color: isCorrect ? "white" : "var(--muted-foreground)",
                          }}
                        >
                          {OPTION_LABELS[key]}
                        </span>
                        <span className="text-sm" style={{ color: isCorrect ? "#4ade80" : undefined }}>
                          {q[`option_${key}` as keyof Question] as string}
                        </span>
                        {isCorrect && <span className="text-[10px] text-green-400 font-bold">← 正解</span>}
                      </div>
                    );
                  })}
                  <p className="text-[10px] text-muted-foreground pt-1">
                    作成: {new Date(q.created_at).toLocaleDateString("ja-JP")}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
