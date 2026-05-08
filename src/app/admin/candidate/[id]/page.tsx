import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase";
import { QUESTIONS, type Question } from "@/lib/questions";
import { uploadCV } from "../../actions";
import { EvaluationForm } from "./evaluation-form";
import { SubmitButton } from "@/components/submit-button";
import { CopyReportLink } from "../../copy-report-link";
import { CVDeleteButton } from "../../cv-delete-button";

export const dynamic = "force-dynamic";

// ── Role question normaliser (mirrors questionnaire/actions) ──────────────────
type RoleQ = {
  id: string;
  type: "mcq" | "open";
  section: "knowledge" | "attitude";
  prompt: string;
  options?: { value: string; label: string }[];
  correct?: string;
  optional?: boolean;
};

function normaliseRoleQuestions(rqs: RoleQ[]): Question[] {
  return rqs.map((q): Question => {
    if (q.type === "mcq") {
      return {
        id: q.id,
        section: q.section,
        type: "mcq",
        prompt: q.prompt,
        options: q.options ?? [],
        correct: q.correct || undefined,
        optional: q.optional || undefined,
      };
    }
    return {
      id: q.id,
      section: q.section,
      type: "text",
      prompt: q.prompt,
      optional: q.optional || undefined,
    };
  });
}

// ── Security event metadata ───────────────────────────────────────────────────
type Severity = "critical" | "high" | "medium" | "low";
type EventMeta = { label: string; severity: Severity };

const EVENT_META: Record<string, EventMeta> = {
  copy_attempt:        { label: "Copy blocked",      severity: "high" },
  paste_attempt:       { label: "Paste blocked",     severity: "high" },
  drag_drop_attempt:   { label: "Drag-drop blocked", severity: "high" },
  suspicious_input:    { label: "Suspicious input",  severity: "critical" },
  print_screen:        { label: "Print Screen",      severity: "high" },
  screenshot_shortcut: { label: "Screenshot key",   severity: "high" },
  devtools_attempt:    { label: "DevTools opened",   severity: "high" },
  print_attempt:       { label: "Print blocked",     severity: "medium" },
  view_source:         { label: "View source",       severity: "medium" },
  save_attempt:        { label: "Save page",         severity: "medium" },
  tab_hidden:          { label: "Tab switch",        severity: "medium" },
  window_blur:         { label: "Window left",       severity: "medium" },
  mouse_left_window:   { label: "Left viewport",     severity: "low" },
  right_click:         { label: "Right click",       severity: "low" },
  tab_visible:         { label: "Tab returned",      severity: "low" },
  window_focus:        { label: "Window returned",   severity: "low" },
};

const SEVERITY_STYLE: Record<Severity, { dot: string; badge: string }> = {
  critical: { dot: "bg-red-500",    badge: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" },
  high:     { dot: "bg-orange-500", badge: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300" },
  medium:   { dot: "bg-amber-400",  badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" },
  low:      { dot: "bg-neutral-400",badge: "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400" },
};

// ── Page ──────────────────────────────────────────────────────────────────────
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

  // ── Load role questions (falls back to hardcoded if no role) ──────────────
  let roleTitle = "Assessment";
  let questions: Question[] = QUESTIONS;

  if (candidate.job_role_id) {
    const { data: role } = await sb
      .from("job_roles")
      .select("title, questions")
      .eq("id", candidate.job_role_id)
      .maybeSingle();

    if (role) {
      roleTitle = role.title;
      const rqs = role.questions as RoleQ[] | null;
      if (Array.isArray(rqs) && rqs.length > 0) {
        questions = normaliseRoleQuestions(rqs);
      }
    }
  }

  // ── Fetch responses & events in parallel ──────────────────────────────────
  const [{ data: responses }, { data: events }] = await Promise.all([
    sb.from("responses").select("question_id, answer, auto_score").eq("candidate_id", id),
    sb.from("suspicious_events").select("event_type, detail, occurred_at")
      .eq("candidate_id", id)
      .order("occurred_at", { ascending: true }),
  ]);

  const answerMap = new Map((responses ?? []).map((r) => [r.question_id, r] as const));

  const knowledgeQs = questions.filter((q) => q.section === "knowledge");
  const attitudeQs  = questions.filter((q) => q.section === "attitude");

  const knowledgeMCQ = knowledgeQs.filter((q) => q.type === "mcq");
  const attitudeMCQ  = attitudeQs.filter(
    (q) => q.type === "mcq" && "correct" in q && q.correct
  );
  const KNOWLEDGE_MAX = knowledgeMCQ.length;
  const ATTITUDE_MAX  = attitudeMCQ.length;
  const TOTAL_MAX     = KNOWLEDGE_MAX + ATTITUDE_MAX;

  const knowledgeScore = knowledgeMCQ.reduce(
    (acc, q) => acc + (answerMap.get(q.id)?.auto_score ?? 0), 0
  );
  const attitudeScore = attitudeMCQ.reduce(
    (acc, q) => acc + (answerMap.get(q.id)?.auto_score ?? 0), 0
  );
  const totalScore   = knowledgeScore + attitudeScore;
  const scorePct     = TOTAL_MAX > 0 ? Math.round((totalScore / TOTAL_MAX) * 100) : 0;
  const scoreGrade   = scorePct >= 75 ? "Strong" : scorePct >= 50 ? "Average" : "Weak";
  const scoreColor   = scorePct >= 75 ? "emerald" : scorePct >= 50 ? "amber" : "red";

  // Security summary
  const FLAG_SKIP  = new Set(["tab_visible", "window_focus"]);
  const flagEvents = (events ?? []).filter((e) => !FLAG_SKIP.has(e.event_type));
  const flagCount  = flagEvents.length;
  const criticalCount = flagEvents.filter(
    (e) => (EVENT_META[e.event_type]?.severity ?? "low") === "critical"
  ).length;
  const highCount = flagEvents.filter(
    (e) => (EVENT_META[e.event_type]?.severity ?? "low") === "high"
  ).length;

  const STATUS_STYLE: Record<string, string> = {
    invited:     "bg-neutral-800 text-neutral-300",
    in_progress: "bg-amber-900/40 text-amber-300",
    submitted:   "bg-blue-900/30 text-blue-300",
    expired:     "bg-red-900/30 text-red-400",
  };

  return (
    <div className="space-y-6 pb-12">

      {/* ── Back nav ── */}
      <div>
        <Link
          href={candidate.job_role_id ? `/admin/roles/${candidate.job_role_id}` : "/admin"}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-emerald-400 transition-colors group"
        >
          <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          {candidate.job_role_id ? `Back to ${roleTitle}` : "All roles"}
        </Link>
      </div>

      {/* ── Candidate header card ── */}
      <div className="relative rounded-2xl border border-neutral-800 bg-neutral-900/60 overflow-hidden">
        <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
        <div className="p-6 flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Avatar */}
          {(() => {
            const initials = candidate.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
            const colors = ["from-violet-500 to-purple-600","from-emerald-500 to-cyan-500","from-orange-500 to-amber-500","from-blue-500 to-indigo-500","from-pink-500 to-rose-500"];
            const color = colors[candidate.name.charCodeAt(0) % colors.length];
            return (
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0 shadow-lg`}>
                <span className="text-white text-lg font-bold">{initials}</span>
              </div>
            );
          })()}

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-neutral-100">{candidate.name}</h1>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[candidate.status] ?? "bg-neutral-800 text-neutral-400"}`}>
                {candidate.status.replace("_", " ")}
              </span>
              {flagCount > 0 && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${flagCount >= 5 ? "bg-red-900/50 text-red-300" : "bg-orange-900/40 text-orange-300"}`}>
                  {flagCount} flag{flagCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-400 mt-0.5">{candidate.email}</p>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-xs text-neutral-500">
                Role: <span className="text-neutral-300 font-medium">{roleTitle}</span>
              </span>
              {candidate.submitted_at && (
                <span className="text-xs text-neutral-500">
                  Submitted: <span className="text-neutral-300">{new Date(candidate.submitted_at).toLocaleString()}</span>
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {(candidate.status === "submitted" || candidate.status === "expired") && (
              <CopyReportLink token={candidate.token} />
            )}
          </div>
        </div>
      </div>

      {/* ── Score overview ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Overall score */}
        <ScoreCard
          label="Overall Score"
          value={`${totalScore} / ${TOTAL_MAX}`}
          sub={`${scorePct}% · ${scoreGrade}`}
          color={scoreColor}
          accent
        />
        <ScoreCard
          label={`Knowledge (/${KNOWLEDGE_MAX})`}
          value={`${knowledgeScore} / ${KNOWLEDGE_MAX}`}
          sub={KNOWLEDGE_MAX > 0 ? `${Math.round((knowledgeScore / KNOWLEDGE_MAX) * 100)}%` : "—"}
          color={KNOWLEDGE_MAX > 0 && knowledgeScore / KNOWLEDGE_MAX >= 0.75 ? "emerald" : knowledgeScore / KNOWLEDGE_MAX >= 0.5 ? "amber" : "red"}
        />
        <ScoreCard
          label={`Approach (/${ATTITUDE_MAX})`}
          value={`${attitudeScore} / ${ATTITUDE_MAX}`}
          sub={ATTITUDE_MAX > 0 ? `${Math.round((attitudeScore / ATTITUDE_MAX) * 100)}%` : "—"}
          color={ATTITUDE_MAX > 0 && attitudeScore / ATTITUDE_MAX >= 0.75 ? "emerald" : attitudeScore / ATTITUDE_MAX >= 0.5 ? "amber" : "red"}
        />
        <ScoreCard
          label="Expected Salary"
          value={
            candidate.expected_salary != null
              ? `${candidate.expected_salary_currency ?? "LKR"} ${Number(candidate.expected_salary).toLocaleString()}`
              : "—"
          }
          sub="per month"
          color="neutral"
        />
      </div>

      {/* Score progress bar */}
      {TOTAL_MAX > 0 && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 px-5 py-4">
          <div className="flex justify-between text-xs text-neutral-500 mb-2">
            <span>Score distribution</span>
            <span className={`font-semibold ${scoreColor === "emerald" ? "text-emerald-400" : scoreColor === "amber" ? "text-amber-400" : "text-red-400"}`}>{scorePct}%</span>
          </div>
          <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                scoreColor === "emerald" ? "bg-gradient-to-r from-emerald-500 to-teal-400" :
                scoreColor === "amber"   ? "bg-gradient-to-r from-amber-400 to-orange-400" :
                                           "bg-gradient-to-r from-red-500 to-rose-400"
              }`}
              style={{ width: `${scorePct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-neutral-600 mt-1.5">
            <span>Knowledge {knowledgeScore}/{KNOWLEDGE_MAX}</span>
            <span>Approach {attitudeScore}/{ATTITUDE_MAX}</span>
          </div>
        </div>
      )}

      {/* ── Security / Integrity ── */}
      <ReviewSection
        title="Security & Integrity"
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        }
        badge={
          flagCount === 0
            ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400">Clean</span>
            : <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${flagCount >= 5 ? "bg-red-900/40 text-red-400" : "bg-orange-900/40 text-orange-400"}`}>
                {flagCount} flag{flagCount !== 1 ? "s" : ""}
                {criticalCount > 0 && ` · ${criticalCount} critical`}
                {highCount > 0 && ` · ${highCount} high`}
              </span>
        }
      >
        {flagCount === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-800/40 bg-emerald-900/10 px-4 py-3">
            <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-emerald-300">No suspicious activity was recorded during this assessment.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {flagEvents.map((ev, i) => {
              const meta   = EVENT_META[ev.event_type] ?? { label: ev.event_type, severity: "low" as Severity };
              const styles = SEVERITY_STYLE[meta.severity];
              return (
                <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-800/40 transition-colors">
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center shrink-0 pt-1">
                    <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
                    {i < flagEvents.length - 1 && <span className="w-px flex-1 bg-neutral-800 mt-1 min-h-[16px]" />}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0 flex items-start gap-2.5 flex-wrap">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${styles.badge}`}>
                      {meta.label}
                    </span>
                    {ev.detail && (
                      <span className="text-xs text-neutral-400 leading-snug flex-1">{ev.detail}</span>
                    )}
                    <span className="text-[10px] text-neutral-600 font-mono shrink-0 ml-auto">
                      {new Date(ev.occurred_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ReviewSection>

      {/* ── Knowledge answers ── */}
      {knowledgeQs.length > 0 && (
        <ReviewSection
          title="Knowledge"
          icon={<span className="text-base">🧠</span>}
          badge={
            KNOWLEDGE_MAX > 0
              ? <span className="text-[11px] font-semibold text-neutral-400">{knowledgeScore}/{KNOWLEDGE_MAX} MCQ correct</span>
              : undefined
          }
        >
          <ol className="space-y-4">
            {knowledgeQs.map((q, i) => (
              <QuestionCard key={q.id} index={i + 1} q={q} answer={answerMap.get(q.id)} section="knowledge" />
            ))}
          </ol>
        </ReviewSection>
      )}

      {/* ── Attitude answers ── */}
      {attitudeQs.length > 0 && (
        <ReviewSection
          title="Approach & Values"
          icon={<span className="text-base">💡</span>}
          badge={
            ATTITUDE_MAX > 0
              ? <span className="text-[11px] font-semibold text-neutral-400">{attitudeScore}/{ATTITUDE_MAX} MCQ correct</span>
              : undefined
          }
        >
          <ol className="space-y-4">
            {attitudeQs.map((q, i) => (
              <QuestionCard key={q.id} index={i + 1} q={q} answer={answerMap.get(q.id)} section="attitude" />
            ))}
          </ol>
        </ReviewSection>
      )}

      {/* ── Salary ── */}
      {(candidate.expected_salary != null || candidate.salary_notes) && (
        <ReviewSection title="Salary Expectation" icon={<span className="text-base">💼</span>}>
          <div className="space-y-3">
            {candidate.expected_salary != null && (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-neutral-100">
                  {Number(candidate.expected_salary).toLocaleString()}
                </span>
                <span className="text-sm text-neutral-500">{candidate.expected_salary_currency ?? "LKR"} / month</span>
              </div>
            )}
            {candidate.salary_notes && (
              <p className="text-sm text-neutral-300 leading-relaxed bg-neutral-800/50 rounded-xl px-4 py-3 whitespace-pre-wrap">
                {candidate.salary_notes}
              </p>
            )}
          </div>
        </ReviewSection>
      )}

      {/* ── CV ── */}
      <ReviewSection title="CV / Résumé" icon={
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      }>
        {candidate.cv_path ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-800/50 bg-emerald-900/10 px-4 py-3">
              <svg className="w-8 h-8 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-300 truncate">{candidate.cv_path.split("/").pop()}</p>
                <p className="text-xs text-emerald-600/70">CV on file</p>
              </div>
              <a
                href={`/api/cv/${candidate.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download
              </a>
            </div>
            <details className="group">
              <summary className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-300 transition-colors select-none list-none flex items-center gap-1">
                <svg className="w-3 h-3 group-open:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
                Replace CV
              </summary>
              <form action={uploadCV} className="mt-3 flex items-center gap-3">
                <input type="hidden" name="id" value={candidate.id} />
                <input type="file" name="cv" accept=".pdf,.doc,.docx" required
                  className="flex-1 text-sm text-neutral-300 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-700 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-neutral-200 file:cursor-pointer hover:file:bg-neutral-600"
                />
                <SubmitButton className="rounded-xl bg-neutral-700 hover:bg-neutral-600 px-3 py-1.5 text-sm font-semibold text-white" loadingText="Uploading…">Replace</SubmitButton>
              </form>
            </details>
            <CVDeleteButton id={candidate.id} cvPath={candidate.cv_path} />
          </div>
        ) : (
          <form action={uploadCV} className="space-y-3">
            <input type="hidden" name="id" value={candidate.id} />
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-700 px-6 py-8 text-center">
              <svg className="mx-auto mb-3 w-10 h-10 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="text-sm text-neutral-400">No CV uploaded yet</p>
              <p className="text-xs text-neutral-600 mt-1">PDF, DOC or DOCX · max 10 MB</p>
              <input type="file" name="cv" accept=".pdf,.doc,.docx" required
                className="mt-4 text-sm text-neutral-300 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-neutral-200 file:cursor-pointer hover:file:bg-neutral-700"
              />
            </div>
            <SubmitButton className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-semibold text-white" loadingText="Uploading…">Upload CV</SubmitButton>
          </form>
        )}
      </ReviewSection>

      {/* ── Admin evaluation ── */}
      <ReviewSection title="Evaluation" icon={
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
        </svg>
      }>
        <EvaluationForm
          id={candidate.id}
          jobRoleId={candidate.job_role_id ?? null}
          defaultKnowledge={candidate.knowledge_rating ?? null}
          defaultAttitude={candidate.attitude_rating ?? null}
          defaultShortlisted={candidate.shortlisted ?? null}
          defaultNotes={candidate.admin_notes ?? null}
          backUrl={candidate.job_role_id ? `/admin/roles/${candidate.job_role_id}` : "/admin"}
        />
      </ReviewSection>
    </div>
  );
}

// ── Shared layout components ──────────────────────────────────────────────────

function ReviewSection({
  title,
  icon,
  badge,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-neutral-800 bg-neutral-900/60">
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-neutral-400">{icon}</span>}
          <h2 className="text-sm font-bold text-neutral-200">{title}</h2>
        </div>
        {badge}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function ScoreCard({
  label, value, sub, color, accent,
}: {
  label: string;
  value: string;
  sub?: string;
  color: "emerald" | "amber" | "red" | "neutral";
  accent?: boolean;
}) {
  const valueColors = {
    emerald: "text-emerald-400",
    amber:   "text-amber-400",
    red:     "text-red-400",
    neutral: "text-neutral-100",
  };
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-neutral-700 bg-neutral-900" : "border-neutral-800 bg-neutral-900/50"}`}>
      <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-xl font-bold ${valueColors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-neutral-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function QuestionCard({
  index, q, answer, section,
}: {
  index: number;
  q: Question;
  answer?: { answer: string; auto_score: number | null } | undefined;
  section: "knowledge" | "attitude";
}) {
  const accentColor = section === "knowledge"
    ? "bg-blue-500/15 text-blue-300 border-blue-500/20"
    : "bg-violet-500/15 text-violet-300 border-violet-500/20";

  if (q.type === "mcq") {
    const correct = (q as { correct?: string }).correct;
    const chosen  = answer?.answer ?? null;
    const isRight = chosen != null && chosen === correct;
    const noAns   = chosen == null || chosen === "";

    return (
      <li className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden">
        {/* Question prompt */}
        <div className="flex items-start gap-3 px-4 pt-4 pb-3">
          <span className={`shrink-0 rounded-lg border px-1.5 py-0.5 text-[11px] font-bold font-mono ${accentColor}`}>
            {String(index).padStart(2, "0")}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-neutral-200 leading-relaxed">{q.prompt}</p>
          </div>
          {!noAns && (
            <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${isRight ? "bg-emerald-900/50 text-emerald-300" : "bg-red-900/50 text-red-300"}`}>
              {isRight ? "✓ Correct" : "✗ Wrong"}
            </span>
          )}
          {noAns && <span className="shrink-0 text-[11px] text-neutral-600 italic">No answer</span>}
        </div>

        {/* MCQ options */}
        <div className="px-4 pb-4 space-y-1.5">
          {q.options.map((opt) => {
            const isChosen  = chosen === opt.value;
            const isCorrect = opt.value === correct;
            let cls = "border-neutral-700/60 text-neutral-500";
            if (isChosen && isRight)       cls = "border-emerald-600/60 bg-emerald-900/20 text-emerald-300";
            else if (isChosen && !isRight) cls = "border-red-600/60 bg-red-900/20 text-red-300";
            else if (!isChosen && isCorrect && !noAns) cls = "border-emerald-700/40 bg-emerald-900/10 text-emerald-500/80";

            return (
              <div key={opt.value} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${cls}`}>
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isChosen  ? (isRight ? "border-emerald-500 bg-emerald-500" : "border-red-500 bg-red-500")
                  : isCorrect && !noAns ? "border-emerald-700" : "border-neutral-700"
                }`}>
                  {isChosen && (
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
                <span className="flex-1">{opt.label}</span>
                {isCorrect && !isChosen && !noAns && (
                  <span className="text-[10px] text-emerald-600 font-semibold">← correct</span>
                )}
                {isCorrect && isChosen && (
                  <span className="text-[10px] text-emerald-400 font-semibold">← correct</span>
                )}
              </div>
            );
          })}
        </div>
      </li>
    );
  }

  // Text question
  const text = answer?.answer?.trim();
  return (
    <li className="rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className={`shrink-0 rounded-lg border px-1.5 py-0.5 text-[11px] font-bold font-mono ${accentColor}`}>
          {String(index).padStart(2, "0")}
        </span>
        <p className="text-sm text-neutral-200 leading-relaxed flex-1">
          {q.prompt}
          {q.optional && (
            <span className="ml-2 text-[10px] text-neutral-600 border border-neutral-700 rounded px-1.5 py-0.5">optional</span>
          )}
        </p>
      </div>
      {text ? (
        <div className="ml-8 rounded-xl bg-neutral-800/60 border border-neutral-700/60 px-4 py-3">
          <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{text}</p>
        </div>
      ) : (
        <p className="ml-8 text-xs text-neutral-600 italic">— no answer provided —</p>
      )}
    </li>
  );
}
