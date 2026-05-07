"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createJobRole } from "./actions";

type Option = { value: string; label: string };
export type Question = {
  id: string;
  type: "mcq" | "open";
  section: "knowledge" | "attitude";
  prompt: string;
  options: Option[];
  correct: string;
  optional: boolean;
};

function blankQuestion(): Question {
  return {
    id: Math.random().toString(36).slice(2),
    type: "mcq",
    section: "knowledge",
    prompt: "",
    options: [
      { value: "a", label: "" },
      { value: "b", label: "" },
      { value: "c", label: "" },
      { value: "d", label: "" },
    ],
    correct: "a",
    optional: false,
  };
}

export function CreateRoleModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function generateWithAI() {
    if (!title.trim()) {
      setError("Enter a role title first.");
      return;
    }
    setError("");
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleTitle: title, roleDescription: description }),
      });
      if (!res.ok) throw new Error();
      const { questions: gen, error: apiErr } = await res.json();
      if (apiErr) throw new Error(apiErr);
      const withIds = (gen as Omit<Question, "id">[]).map((q) => ({
        ...q,
        id: Math.random().toString(36).slice(2),
        options: q.options ?? [],
        correct: q.correct ?? "",
        optional: q.optional ?? false,
      }));
      setQuestions((prev) => [...prev, ...withIds]);
    } catch {
      setError("AI generation failed. Check your ANTHROPIC_API_KEY in .env.local.");
    } finally {
      setGenerating(false);
    }
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, blankQuestion()]);
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function updateQuestion(id: string, updates: Partial<Question>) {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  }

  function updateOption(qId: string, optIdx: number, label: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q;
        const opts = [...q.options];
        opts[optIdx] = { ...opts[optIdx], label };
        return { ...q, options: opts };
      })
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const fd = new FormData();
    fd.set("title", title);
    fd.set("description", description);
    fd.set("questions", JSON.stringify(questions));
    startTransition(async () => {
      try {
        await createJobRole(fd);
        router.refresh();
        onClose();
      } catch {
        setError("Failed to create role. Please try again.");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl shadow-black/20 w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-200/60 dark:border-neutral-700/60">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800 shrink-0">
          <div>
            <h2 className="font-bold text-base">Create Job Role</h2>
            <p className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5">
              Define the role and its assessment questions
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-800 flex items-center justify-center text-gray-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* Role details */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-widest">
                  Role Title <span className="text-red-400">*</span>
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. Senior Software Engineer"
                  className="mt-1.5 w-full rounded-xl bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-400 dark:placeholder:text-neutral-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-widest">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Brief description of the role…"
                  className="mt-1.5 w-full rounded-xl bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-400 dark:placeholder:text-neutral-600 resize-none"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 dark:border-neutral-800" />

            {/* Questions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold">Assessment Questions</h3>
                  <p className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5">
                    {questions.length} question{questions.length !== 1 ? "s" : ""} added
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={generateWithAI}
                    disabled={generating}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-violet-300 dark:border-violet-700/60 bg-violet-50 dark:bg-violet-900/10 hover:bg-violet-100 dark:hover:bg-violet-900/20 text-violet-600 dark:text-violet-400 text-xs font-semibold px-3 py-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {generating ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Generating…
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                        Generate with AI
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-600 dark:text-neutral-300 text-xs font-semibold px-3 py-1.5 transition-colors"
                  >
                    + Add Manually
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 px-4 py-2.5 text-xs text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              {questions.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-neutral-800 py-10 text-center">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-gray-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-neutral-400">No questions yet</p>
                  <p className="text-xs text-gray-400 dark:text-neutral-600 mt-1">
                    Click <strong>Generate with AI</strong> or add manually
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, idx) => (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      index={idx}
                      onUpdate={(u) => updateQuestion(q.id, u)}
                      onUpdateOption={(i, label) => updateOption(q.id, i, label)}
                      onRemove={() => removeQuestion(q.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-neutral-800 flex items-center justify-between gap-3 shrink-0">
            <p className="text-xs text-gray-400 dark:text-neutral-600">
              {questions.length > 0 ? `${questions.length} question${questions.length !== 1 ? "s" : ""} will be saved with this role` : "You can add questions later"}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !title.trim()}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold text-white shadow-sm shadow-emerald-500/20 transition-all"
              >
                {isPending ? "Creating…" : "Create Role"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  index,
  onUpdate,
  onUpdateOption,
  onRemove,
}: {
  question: Question;
  index: number;
  onUpdate: (u: Partial<Question>) => void;
  onUpdateOption: (optIdx: number, label: string) => void;
  onRemove: () => void;
}) {
  const sectionColor = question.section === "knowledge"
    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
    : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400";

  return (
    <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-800/30 p-4 space-y-3">
      {/* Card header */}
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-neutral-400 shrink-0">
          {index + 1}
        </span>
        <select
          value={question.section}
          onChange={(e) => onUpdate({ section: e.target.value as "knowledge" | "attitude" })}
          className={`rounded-lg px-2 py-1 text-xs font-medium border-0 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${sectionColor}`}
        >
          <option value="knowledge">Knowledge</option>
          <option value="attitude">Attitude</option>
        </select>
        <select
          value={question.type}
          onChange={(e) => onUpdate({ type: e.target.value as "mcq" | "open" })}
          className="rounded-lg bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="mcq">Multiple Choice</option>
          <option value="open">Open Ended</option>
        </select>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onRemove}
          className="w-6 h-6 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-gray-300 dark:text-neutral-700 hover:text-red-500 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Prompt */}
      <textarea
        value={question.prompt}
        onChange={(e) => onUpdate({ prompt: e.target.value })}
        placeholder="Enter your question here…"
        rows={2}
        className="w-full rounded-xl bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none placeholder:text-gray-400 dark:placeholder:text-neutral-600"
      />

      {/* MCQ options */}
      {question.type === "mcq" && (
        <div className="space-y-2">
          {question.options.map((opt, i) => (
            <div key={opt.value} className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => onUpdate({ correct: opt.value })}
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  question.correct === opt.value
                    ? "border-emerald-500 bg-emerald-500 shadow-sm shadow-emerald-500/30"
                    : "border-gray-300 dark:border-neutral-600 hover:border-emerald-400"
                }`}
              >
                {question.correct === opt.value && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </button>
              <span className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase w-3">
                {opt.value}
              </span>
              <input
                value={opt.label}
                onChange={(e) => onUpdateOption(i, e.target.value)}
                placeholder={`Option ${opt.value.toUpperCase()}`}
                className="flex-1 rounded-lg bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-gray-400 dark:placeholder:text-neutral-600"
              />
            </div>
          ))}
          <p className="text-[10px] text-gray-400 dark:text-neutral-600 pl-6.5">
            Click the circle to mark the correct answer
          </p>
        </div>
      )}
    </div>
  );
}
