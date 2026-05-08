"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateJobRole } from "./actions";
import { type Question, blankQuestion, QuestionCard } from "./create-role-modal";

type EditRoleModalProps = {
  role: {
    id: string;
    title: string;
    description: string | null;
    questions: Question[];
  };
  onClose: () => void;
};

export function EditRoleModal({ role, onClose }: EditRoleModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(role.title);
  const [description, setDescription] = useState(role.description ?? "");
  const [questions, setQuestions] = useState<Question[]>(() =>
    role.questions.map((q) => ({
      ...q,
      id: q.id || Math.random().toString(36).slice(2),
      options: q.options ?? [],
      correct: q.correct ?? "",
      optional: q.optional ?? false,
    }))
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function generateWithAI() {
    if (!title.trim()) { setError("Enter a role title first."); return; }
    setError("");
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleTitle: title, roleDescription: description }),
      });
      const payload = await res.json();
      if (!res.ok || payload.error) throw new Error(payload.error ?? `HTTP ${res.status}`);
      const gen = payload.questions as Omit<Question, "id">[];
      const withIds = gen.map((q) => ({
        ...q,
        id: Math.random().toString(36).slice(2),
        options: q.options ?? [],
        correct: q.correct ?? "",
        optional: q.optional ?? false,
      }));
      setQuestions((prev) => [...prev, ...withIds]);
    } catch (err) {
      setError(`Failed to generate questions. (${err instanceof Error ? err.message : String(err)})`);
    } finally {
      setGenerating(false);
    }
  }

  function addQuestion() { setQuestions((prev) => [...prev, blankQuestion()]); }
  function removeQuestion(id: string) { setQuestions((prev) => prev.filter((q) => q.id !== id)); }
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
    fd.set("id", role.id);
    fd.set("title", title);
    fd.set("description", description);
    fd.set("questions", JSON.stringify(questions));
    startTransition(async () => {
      try {
        await updateJobRole(fd);
        router.refresh();
        onClose();
      } catch {
        setError("Failed to save changes. Please try again.");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl shadow-black/20 w-full max-w-2xl max-h-[98vh] flex flex-col border border-gray-200/60 dark:border-neutral-700/60">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-800 shrink-0">
          <div>
            <h2 className="font-bold text-base">Edit Job Role</h2>
            <p className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5">
              Update the role details and assessment questions
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
              {questions.length > 0
                ? `${questions.length} question${questions.length !== 1 ? "s" : ""} will be saved`
                : "No questions — you can add them later"}
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
                {isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
