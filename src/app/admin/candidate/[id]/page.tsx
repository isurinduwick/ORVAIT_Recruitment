import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase";
import { QUESTIONS } from "@/lib/questions";
import { saveEvaluation, deleteCandidate, uploadCV } from "../../actions";
import { SubmitButton } from "@/components/submit-button";
import { CopyReportLink } from "../../copy-report-link";
import { CVDeleteButton } from "../../cv-delete-button";

export const dynamic = "force-dynamic";

const KNOWLEDGE_MCQ_MAX = QUESTIONS.filter(
  (q) => q.section === "knowledge" && q.type === "mcq"
).length;
const ATTITUDE_MCQ_MAX = QUESTIONS.filter(
  (q) => q.section === "attitude" && q.type === "mcq" && "correct" in q && q.correct
).length;
const TOTAL_MAX = KNOWLEDGE_MCQ_MAX + ATTITUDE_MCQ_MAX;

export default async function CandidateReview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { id } = await params;
  const sb = supabaseService();

  const { data: candidate } = await sb
    .from("candidates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!candidate) notFound();

  const { data: responses } = await sb
    .from("responses")
    .select("question_id, answer, auto_score")
    .eq("candidate_id", id);

  const { data: events } = await sb
    .from("suspicious_events")
    .select("event_type, detail, occurred_at")
    .eq("candidate_id", id)
    .order("occurred_at", { ascending: true });

  const answerMap = new Map(
    (responses ?? []).map((r) => [r.question_id, r] as const)
  );

  const knowledgeQs = QUESTIONS.filter((q) => q.section === "knowledge");
  const attitudeQs = QUESTIONS.filter((q) => q.section === "attitude");

  // Compute scores
  const knowledgeScore = knowledgeQs
    .filter((q) => q.type === "mcq")
    .reduce((acc, q) => acc + (answerMap.get(q.id)?.auto_score ?? 0), 0);

  const attitudeScore = attitudeQs
    .filter((q) => q.type === "mcq" && "correct" in q && q.correct)
    .reduce((acc, q) => acc + (answerMap.get(q.id)?.auto_score ?? 0), 0);

  const totalScore = knowledgeScore + attitudeScore;

  const scorePercent = Math.round((totalScore / TOTAL_MAX) * 100);
  const scoreLabel =
    scorePercent >= 75 ? "Strong" : scorePercent >= 50 ? "Average" : "Weak";
  const scoreLabelColor =
    scorePercent >= 75
      ? "text-emerald-400"
      : scorePercent >= 50
        ? "text-amber-400"
        : "text-red-400";

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={candidate.job_role_id ? `/admin/roles/${candidate.job_role_id}` : "/admin"}
          className="text-sm text-gray-500 dark:text-neutral-400 hover:text-gray-800 dark:hover:text-neutral-200"
        >
          ← {candidate.job_role_id ? "Back to role" : "All roles"}
        </Link>
        <div className="mt-2 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">{candidate.name}</h1>
            <p className="text-gray-500 dark:text-neutral-400">{candidate.email}</p>
          </div>
          <div className="flex items-center gap-3">
            {(candidate.status === "submitted" || candidate.status === "expired") && (
              <CopyReportLink token={candidate.token} />
            )}
            <span className="text-xs text-gray-400 dark:text-neutral-500">Status: {candidate.status}</span>
          </div>
        </div>
      </div>

      {/* Score summary */}
      <section className="grid md:grid-cols-4 gap-4">
        <div className="md:col-span-1 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="text-xs text-gray-400 dark:text-neutral-500 mb-1">Overall score</div>
          <div className={`text-3xl font-bold ${scoreLabelColor}`}>
            {totalScore}/{TOTAL_MAX}
          </div>
          <div className={`text-sm mt-1 font-medium ${scoreLabelColor}`}>{scoreLabel}</div>
          <div className="text-xs text-gray-300 dark:text-neutral-600 mt-0.5">{scorePercent}%</div>
        </div>
        <Stat
          label={`Knowledge MCQ (/${KNOWLEDGE_MCQ_MAX})`}
          value={`${knowledgeScore} / ${KNOWLEDGE_MCQ_MAX}`}
          color={knowledgeScore >= KNOWLEDGE_MCQ_MAX * 0.75 ? "emerald" : knowledgeScore >= KNOWLEDGE_MCQ_MAX * 0.5 ? "amber" : "red"}
        />
        <Stat
          label={`Attitude MCQ (/${ATTITUDE_MCQ_MAX})`}
          value={`${attitudeScore} / ${ATTITUDE_MCQ_MAX}`}
          color={attitudeScore >= ATTITUDE_MCQ_MAX * 0.75 ? "emerald" : attitudeScore >= ATTITUDE_MCQ_MAX * 0.5 ? "amber" : "red"}
        />
        <Stat
          label="Expected salary"
          value={
            candidate.expected_salary != null
              ? `${candidate.expected_salary_currency ?? ""} ${Number(candidate.expected_salary).toLocaleString()}`
              : "—"
          }
        />
      </section>

      {candidate.salary_notes && (
        <section className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-5">
          <h3 className="font-medium mb-2">Salary notes</h3>
          <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-neutral-300">{candidate.salary_notes}</p>
        </section>
      )}

      {/* Knowledge answers */}
      <section>
        <h2 className="font-semibold mb-3">
          Knowledge answers{" "}
          <span className="text-gray-400 dark:text-neutral-500 font-normal text-sm">
            ({knowledgeScore}/{KNOWLEDGE_MCQ_MAX} MCQ correct)
          </span>
        </h2>
        <ol className="space-y-4">
          {knowledgeQs.map((q, i) => {
            const r = answerMap.get(q.id);
            const isCorrect = q.type === "mcq" && r?.answer === (q as { correct?: string }).correct;
            const chosenLabel =
              q.type === "mcq"
                ? q.options.find((o) => o.value === r?.answer)?.label
                : undefined;
            const correctLabel =
              q.type === "mcq"
                ? q.options.find((o) => o.value === (q as { correct?: string }).correct)?.label
                : undefined;
            return (
              <li key={q.id} className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-gray-700 dark:text-neutral-300">
                    <span className="text-gray-400 dark:text-neutral-500">Q{i + 1}.</span> {q.prompt}
                  </p>
                  {q.type === "mcq" && r && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                        isCorrect
                          ? "bg-emerald-900/60 text-emerald-200"
                          : "bg-red-900/60 text-red-200"
                      }`}
                    >
                      {isCorrect ? "✓ correct" : "✗ incorrect"}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-sm">
                  {q.type === "mcq" ? (
                    <div className="space-y-1">
                      <p className="text-gray-800 dark:text-neutral-200">
                        <span className="text-gray-400 dark:text-neutral-500">Answer: </span>
                        {r ? chosenLabel ?? r.answer : "— no answer —"}
                      </p>
                      {!isCorrect && correctLabel && r && (
                        <p className="text-emerald-400/70 text-xs">
                          <span className="text-gray-400 dark:text-neutral-500">Correct: </span>
                          {correctLabel}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-gray-800 dark:text-neutral-200">
                      {r?.answer || "— no answer —"}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Attitude answers */}
      <section>
        <h2 className="font-semibold mb-3">
          Attitude answers{" "}
          <span className="text-gray-400 dark:text-neutral-500 font-normal text-sm">
            ({attitudeScore}/{ATTITUDE_MCQ_MAX} MCQ correct)
          </span>
        </h2>
        <ol className="space-y-4">
          {attitudeQs.map((q, i) => {
            const r = answerMap.get(q.id);
            const hasCorrect = q.type === "mcq" && "correct" in q && q.correct;
            const isCorrect = hasCorrect && r?.answer === (q as { correct?: string }).correct;
            const chosenLabel =
              q.type === "mcq"
                ? q.options.find((o) => o.value === r?.answer)?.label
                : undefined;
            const correctLabel =
              hasCorrect
                ? (q as { options: { value: string; label: string }[] }).options.find(
                    (o) => o.value === (q as { correct?: string }).correct
                  )?.label
                : undefined;
            return (
              <li key={q.id} className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-gray-700 dark:text-neutral-300">
                    <span className="text-gray-400 dark:text-neutral-500">Q{i + 1}.</span>{" "}
                    {q.prompt}
                    {q.optional && (
                      <span className="ml-2 text-xs text-gray-300 dark:text-neutral-600 border border-neutral-700 rounded px-1">
                        optional
                      </span>
                    )}
                  </p>
                  {q.type === "mcq" && r && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                        isCorrect
                          ? "bg-emerald-900/60 text-emerald-200"
                          : "bg-red-900/60 text-red-200"
                      }`}
                    >
                      {isCorrect ? "✓ recommended" : "✗ not recommended"}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-sm space-y-1">
                  {q.type === "mcq" ? (
                    <>
                      <p className="text-gray-800 dark:text-neutral-200">
                        <span className="text-gray-400 dark:text-neutral-500">Answer: </span>
                        {r ? chosenLabel ?? r.answer : "— no answer —"}
                      </p>
                      {!isCorrect && correctLabel && r && (
                        <p className="text-emerald-400/70 text-xs">
                          <span className="text-gray-400 dark:text-neutral-500">Recommended: </span>
                          {correctLabel}
                        </p>
                      )}
                      {!r && (
                        <p className="text-gray-300 dark:text-neutral-600 italic">— no answer —</p>
                      )}
                    </>
                  ) : (
                    <p className="whitespace-pre-wrap text-gray-800 dark:text-neutral-200">
                      {r?.answer || "— no answer —"}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Suspicious activity log */}
      <section>
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          Suspicious activity
          {events && events.length > 0 ? (
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
              {events.length} event{events.length !== 1 ? "s" : ""} detected
            </span>
          ) : (
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
              None detected
            </span>
          )}
        </h2>
        {!events || events.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-neutral-500">No suspicious behaviour was recorded during this assessment.</p>
        ) : (
          <div className="border border-gray-200 dark:border-neutral-800 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-neutral-900 text-gray-500 dark:text-neutral-400 text-left">
                <tr>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Event</th>
                  <th className="px-3 py-2">Detail</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev, i) => (
                  <tr key={i} className="border-t border-gray-200 dark:border-neutral-800">
                    <td className="px-3 py-2 text-gray-400 dark:text-neutral-500 whitespace-nowrap font-mono">
                      {new Date(ev.occurred_at).toLocaleTimeString()}
                    </td>
                    <td className="px-3 py-2">
                      <EventBadge type={ev.event_type} />
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-neutral-300">{ev.detail ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CV upload / download */}
      <section className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-5">
        <h2 className="font-semibold mb-4">CV / Résumé</h2>

        {candidate.cv_path ? (
          /* ── CV already uploaded ── */
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-900/10 px-4 py-3">
              <svg className="w-8 h-8 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 truncate">
                  {candidate.cv_path.split("/").pop()}
                </p>
                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/60">CV on file</p>
              </div>
              <a
                href={`/api/cv/${candidate.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download
              </a>
            </div>

            {/* Replace CV */}
            <details className="group">
              <summary className="text-xs text-gray-400 dark:text-neutral-500 cursor-pointer hover:text-gray-600 dark:hover:text-neutral-300 select-none">
                Replace CV…
              </summary>
              <form action={uploadCV} className="mt-3 flex items-center gap-3">
                <input type="hidden" name="id" value={candidate.id} />
                <input
                  type="file"
                  name="cv"
                  accept=".pdf,.doc,.docx"
                  required
                  className="flex-1 text-sm text-gray-700 dark:text-neutral-300 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-neutral-200 file:cursor-pointer hover:file:bg-neutral-700"
                />
                <SubmitButton
                  className="rounded-md bg-neutral-700 hover:bg-neutral-600 px-3 py-1.5 text-sm font-medium text-white"
                  loadingText="Uploading…"
                >
                  Replace
                </SubmitButton>
              </form>
            </details>

            {/* Delete CV */}
            <CVDeleteButton id={candidate.id} cvPath={candidate.cv_path} />
          </div>
        ) : (
          /* ── No CV yet ── */
          <form action={uploadCV} className="space-y-3">
            <input type="hidden" name="id" value={candidate.id} />
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-neutral-700 px-6 py-8 text-center">
              <svg className="mx-auto mb-3 w-10 h-10 text-gray-300 dark:text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="text-sm text-gray-500 dark:text-neutral-400 mb-1">No CV uploaded yet</p>
              <p className="text-xs text-gray-400 dark:text-neutral-500">PDF, DOC or DOCX · max 10 MB</p>
              <input
                type="file"
                name="cv"
                accept=".pdf,.doc,.docx"
                required
                className="mt-4 text-sm text-gray-700 dark:text-neutral-300 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-neutral-200 file:cursor-pointer hover:file:bg-neutral-700"
              />
            </div>
            <SubmitButton
              className="rounded-md bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-medium text-white"
              loadingText="Uploading…"
            >
              Upload CV
            </SubmitButton>
          </form>
        )}
      </section>

      {/* Admin evaluation */}
      <section className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-5">
        <h2 className="font-semibold mb-3">Your evaluation</h2>
        <form action={saveEvaluation} className="space-y-4">
          <input type="hidden" name="id" value={candidate.id} />
          <div className="grid md:grid-cols-2 gap-4">
            <label className="text-sm space-y-1">
              <span className="text-gray-500 dark:text-neutral-400">Knowledge rating (1–5)</span>
              <input
                type="number"
                min={1}
                max={5}
                name="knowledge_rating"
                defaultValue={candidate.knowledge_rating ?? ""}
                className="w-full rounded-md bg-gray-100 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-gray-500 dark:text-neutral-400">Attitude rating (1–5)</span>
              <input
                type="number"
                min={1}
                max={5}
                name="attitude_rating"
                defaultValue={candidate.attitude_rating ?? ""}
                className="w-full rounded-md bg-gray-100 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="text-sm space-y-1 block">
            <span className="text-gray-500 dark:text-neutral-400">Shortlist?</span>
            <select
              name="shortlisted"
              defaultValue={
                candidate.shortlisted === true
                  ? "yes"
                  : candidate.shortlisted === false
                    ? "no"
                    : ""
              }
              className="w-full rounded-md bg-gray-100 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 px-3 py-2 text-sm"
            >
              <option value="">— undecided —</option>
              <option value="yes">Yes, shortlist</option>
              <option value="no">No, reject</option>
            </select>
          </label>
          <label className="text-sm space-y-1 block">
            <span className="text-gray-500 dark:text-neutral-400">Admin notes</span>
            <textarea
              name="admin_notes"
              rows={4}
              defaultValue={candidate.admin_notes ?? ""}
              className="w-full rounded-md bg-gray-100 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex justify-between">
            <SubmitButton
              className="rounded-md bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-medium text-white"
              loadingText="Saving…"
            >
              Save evaluation
            </SubmitButton>
          </div>
        </form>
        <form action={deleteCandidate} className="mt-4 pt-4 border-t border-gray-200 dark:border-neutral-800">
          <input type="hidden" name="id" value={candidate.id} />
          {candidate.job_role_id && (
            <input type="hidden" name="job_role_id" value={candidate.job_role_id} />
          )}
          <button className="text-xs text-red-400 hover:text-red-300">
            Delete candidate
          </button>
        </form>
      </section>
    </div>
  );
}

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  tab_hidden:          { label: "Tab hidden",        color: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300" },
  tab_visible:         { label: "Tab returned",      color: "bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400" },
  window_blur:         { label: "Window left",       color: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300" },
  window_focus:        { label: "Window returned",   color: "bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400" },
  copy_attempt:        { label: "Copy attempt",      color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" },
  paste_attempt:       { label: "Paste attempt",     color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" },
  print_screen:        { label: "Print Screen",      color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" },
  print_attempt:       { label: "Print attempt",     color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" },
  screenshot_shortcut: { label: "Screenshot key",   color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" },
  devtools_attempt:    { label: "DevTools",          color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" },
  right_click:         { label: "Right click",       color: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300" },
};

function EventBadge({ type }: { type: string }) {
  const meta = EVENT_LABELS[type] ?? { label: type, color: "bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300" };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>
      {meta.label}
    </span>
  );
}

function Stat({
  label,
  value,
  color = "neutral",
}: {
  label: string;
  value: string;
  color?: "emerald" | "amber" | "red" | "neutral";
}) {
  const colors = {
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
    neutral: "text-neutral-100",
  };
  return (
    <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-4">
      <div className="text-xs text-gray-400 dark:text-neutral-500">{label}</div>
      <div className={`text-lg font-semibold mt-1 ${colors[color]}`}>{value}</div>
    </div>
  );
}
