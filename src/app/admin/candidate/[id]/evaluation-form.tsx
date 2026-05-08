"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { saveEvaluation, deleteCandidate } from "../../actions";

type Props = {
  id: string;
  jobRoleId: string | null;
  defaultKnowledge: number | null;
  defaultAttitude: number | null;
  defaultShortlisted: boolean | null;
  defaultNotes: string | null;
  backUrl: string;
};

export function EvaluationForm({
  id,
  jobRoleId,
  defaultKnowledge,
  defaultAttitude,
  defaultShortlisted,
  defaultNotes,
  backUrl,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      await saveEvaluation(data);
      setSaved(true);
      setTimeout(() => {
        router.push(backUrl);
        router.refresh();
      }, 1400);
    });
  }

  // ── Success state ────────────────────────────────────────────────────────
  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
          <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <div>
          <p className="text-base font-bold text-emerald-400">Evaluation saved</p>
          <p className="text-sm text-neutral-500 mt-1">Returning to candidates…</p>
        </div>
        <div className="w-32 h-1 rounded-full bg-neutral-800 overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full animate-[grow_1.3s_ease-in-out_forwards]" />
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-5">
        <input type="hidden" name="id" value={id} />

        {/* Ratings */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Knowledge rating (1–5)
            </label>
            <input
              type="number" min={1} max={5} name="knowledge_rating"
              defaultValue={defaultKnowledge ?? ""}
              placeholder="—"
              className="w-full rounded-xl bg-neutral-800/80 border border-neutral-700 px-4 py-2.5 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Attitude rating (1–5)
            </label>
            <input
              type="number" min={1} max={5} name="attitude_rating"
              defaultValue={defaultAttitude ?? ""}
              placeholder="—"
              className="w-full rounded-xl bg-neutral-800/80 border border-neutral-700 px-4 py-2.5 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-all"
            />
          </div>
        </div>

        {/* Shortlist */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Shortlist decision
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "",    label: "Undecided", cls: "border-neutral-700 text-neutral-400 has-[:checked]:border-neutral-500 has-[:checked]:bg-neutral-800 has-[:checked]:text-neutral-200" },
              { value: "yes", label: "✓ Shortlist", cls: "border-emerald-800/50 text-emerald-600 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-900/30 has-[:checked]:text-emerald-300" },
              { value: "no",  label: "✗ Reject",   cls: "border-red-900/40 text-red-600 has-[:checked]:border-red-500 has-[:checked]:bg-red-900/20 has-[:checked]:text-red-300" },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold cursor-pointer transition-all ${opt.cls}`}
              >
                <input
                  type="radio" name="shortlisted" value={opt.value} className="sr-only"
                  defaultChecked={
                    opt.value === ""
                      ? defaultShortlisted == null
                      : opt.value === "yes"
                      ? defaultShortlisted === true
                      : defaultShortlisted === false
                  }
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Admin notes
          </label>
          <textarea
            name="admin_notes" rows={4}
            defaultValue={defaultNotes ?? ""}
            placeholder="Internal notes visible only to the hiring team…"
            className="w-full rounded-xl bg-neutral-800/80 border border-neutral-700 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-all resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all"
          >
            {isPending ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Saving…
              </>
            ) : "Save evaluation"}
          </button>

          {/* Delete — separate server action form */}
          <form action={deleteCandidate}>
            <input type="hidden" name="id" value={id} />
            {jobRoleId && <input type="hidden" name="job_role_id" value={jobRoleId} />}
            <button
              type="submit"
              className="text-xs text-neutral-600 hover:text-red-400 transition-colors"
            >
              Delete candidate
            </button>
          </form>
        </div>
      </form>
    </div>
  );
}
