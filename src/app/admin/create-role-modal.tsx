"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createJobRole } from "./actions";

const AI_STEPS = [
  { text: "Analyzing the role requirements with AI", emoji: "✨" },
  { text: "Crafting smart interview questions…", emoji: "🤖" },
  { text: "Generating role-specific assessments…", emoji: "🧠" },
  { text: "Fine-tuning questions for better candidate evaluation…", emoji: "" },
  { text: "Creating a personalized question set for your recruitment flow", emoji: "" },
];

const TOTAL_MS = AI_STEPS.length * 9000;

function AIGeneratingOverlay({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; });

  useEffect(() => {
    const startTime = Date.now();

    // Smooth continuous progress bar
    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min((elapsed / TOTAL_MS) * 100, 99));
    }, 80);

    // Step cycling
    let current = 0;
    const stepTimer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        current++;
        if (current >= AI_STEPS.length) {
          clearInterval(stepTimer);
          clearInterval(progressTimer);
          setProgress(100);
          onCompleteRef.current();
          return;
        }
        setStep(current);
        setVisible(true);
      }, 380);
    }, 9000);

    return () => {
      clearInterval(progressTimer);
      clearInterval(stepTimer);
    };
  }, []);

  const cur = AI_STEPS[step];

  return (
    <div className="absolute inset-0 z-20 rounded-2xl overflow-hidden flex flex-col items-center justify-center">

      {/* Frosted glass backdrop over modal content */}
      <div className="absolute inset-0 bg-white/80 dark:bg-neutral-900/90 backdrop-blur-xl" />

      {/* Soft radial glow accents */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(16,185,129,0.08),transparent_55%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_80%,rgba(139,92,246,0.07),transparent_55%)] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-10 w-full">

        {/* Orbit rings */}
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 rounded-full border border-emerald-400/30 dark:border-emerald-500/25 animate-spin" style={{ animationDuration: "9s" }} />
          <div className="absolute inset-[6px] rounded-full border border-violet-400/20 dark:border-violet-500/20 animate-spin" style={{ animationDuration: "6s", animationDirection: "reverse" }} />
          <div className="absolute inset-[12px] rounded-full bg-emerald-400/8 dark:bg-emerald-500/5 animate-ping" style={{ animationDuration: "2.4s" }} />
          <div className="absolute inset-[12px] rounded-full bg-gradient-to-br from-emerald-500/15 to-violet-500/15 dark:from-emerald-500/20 dark:to-violet-500/20 border border-emerald-400/30 dark:border-emerald-500/25 flex items-center justify-center">
            <svg className="w-7 h-7 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
        </div>

        {/* Badge */}
        <div className="flex items-center gap-2 mb-5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-emerald-600 dark:text-emerald-500">
            AI Question Generator · Step {step + 1} / {AI_STEPS.length}
          </p>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        {/* Cycling message */}
        <div className="min-h-[60px] flex items-center justify-center w-full">
          <p
            className="font-semibold text-[17px] text-center leading-snug text-gray-900 dark:text-white transition-all duration-350"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0px)" : "translateY(8px)",
            }}
          >
            {cur.text}
            {cur.emoji && <span className="ml-1.5">{cur.emoji}</span>}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs mt-8">
          <div className="flex justify-between text-[10px] text-gray-400 dark:text-neutral-500 mb-1.5">
            <span className="font-medium tracking-wide">Generating your question set…</span>
            <span className="font-semibold tabular-nums">{Math.round(progress)}%</span>
          </div>
          <div className="h-1 rounded-full bg-gray-200 dark:bg-neutral-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-2 mt-6">
          {AI_STEPS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-500"
              style={{
                width: i === step ? "22px" : "6px",
                height: "6px",
                background:
                  i < step
                    ? "rgba(16,185,129,0.6)"
                    : i === step
                    ? "#10b981"
                    : "rgba(156,163,175,0.4)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

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

export function blankQuestion(): Question {
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
  const [apiDone, setApiDone] = useState(false);
  const [animDone, setAnimDone] = useState(false);
  const [pendingQuestions, setPendingQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (apiDone && animDone) {
      setQuestions((prev) => [...prev, ...pendingQuestions]);
      setGenerating(false);
      setApiDone(false);
      setAnimDone(false);
      setPendingQuestions([]);
    }
  }, [apiDone, animDone, pendingQuestions]);

  async function generateWithAI() {
    if (!title.trim()) {
      setError("Enter a role title first.");
      return;
    }
    setError("");
    setGenerating(true);
    setApiDone(false);
    setAnimDone(false);
    setPendingQuestions([]);
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
      setPendingQuestions(withIds);
      setApiDone(true);
    } catch (err) {
      setError(`Failed to generate questions. Please try again. (${err instanceof Error ? err.message : String(err)})`);
      setGenerating(false);
      setApiDone(false);
      setAnimDone(false);
      setPendingQuestions([]);
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
      onClick={(e) => { if (e.target === e.currentTarget && !generating) onClose(); }}
    >
      <div className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl shadow-black/20 w-full max-w-2xl max-h-[98vh] flex flex-col border border-gray-200/60 dark:border-neutral-700/60">
        {generating && <AIGeneratingOverlay onComplete={() => setAnimDone(true)} />}

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

export function QuestionCard({
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
