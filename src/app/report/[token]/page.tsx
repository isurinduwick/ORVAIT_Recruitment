import { notFound } from "next/navigation";
import { supabaseService } from "@/lib/supabase";
import { QUESTIONS } from "@/lib/questions";
import { ExpandableDetails } from "../expandable-details";

export const dynamic = "force-dynamic";

// ── Score constants ──────────────────────────────────────────────────────────
const knowledgeMCQs = QUESTIONS.filter(
  (q) => q.section === "knowledge" && q.type === "mcq"
);
const attitudeMCQs = QUESTIONS.filter(
  (q) => q.section === "attitude" && q.type === "mcq" && "correct" in q && q.correct
);
const KNOWLEDGE_MAX = knowledgeMCQs.length;
const ATTITUDE_MAX = attitudeMCQs.length;
const TOTAL_MAX = KNOWLEDGE_MAX + ATTITUDE_MAX;

// ── Topic groupings for knowledge ─────────────────────────────────────────────
const TOPIC_GROUPS: { label: string; ids: string[] }[] = [
  { label: "Laravel / PHP", ids: ["k_laravel_eloquent", "k_php_strict", "k_laravel_middleware", "k_laravel_n1"] },
  { label: "MySQL", ids: ["k_mysql_index", "k_mysql_transaction"] },
  { label: "CI / CD", ids: ["k_cicd_concepts", "k_cicd_pipeline"] },
  { label: "AI & Security", ids: ["k_ai_usage", "k_ai_risk"] },
];

// ── Summary generators ────────────────────────────────────────────────────────
function knowledgeSummary(
  topicResults: { label: string; score: number; max: number }[]
): string {
  const strong = topicResults.filter((t) => t.score / t.max >= 0.75).map((t) => t.label);
  const weak   = topicResults.filter((t) => t.score / t.max < 0.5).map((t) => t.label);
  const mid    = topicResults.filter((t) => t.score / t.max >= 0.5 && t.score / t.max < 0.75).map((t) => t.label);

  const parts: string[] = [];
  if (strong.length)
    parts.push(`Demonstrated solid understanding in ${strong.join(" and ")}.`);
  if (mid.length)
    parts.push(`Showed adequate grasp of ${mid.join(" and ")}.`);
  if (weak.length)
    parts.push(`Has gaps in ${weak.join(" and ")} that may need attention.`);
  if (parts.length === 0)
    parts.push("Insufficient data to draw topic-level conclusions.");
  return parts.join(" ");
}

function attitudeSummary(score: number, max: number, hasWritten: boolean): string {
  const pct = score / max;
  let tone = "";
  if (pct >= 0.8)
    tone = "The candidate's behavioral judgment is consistently aligned with professional best practices — proactive communication, ownership, and structured decision-making are evident throughout.";
  else if (pct >= 0.6)
    tone = "The candidate shows generally sound professional judgment with most responses favouring clear communication and thoughtful escalation, though there is room to develop more consistently on a few scenarios.";
  else if (pct >= 0.4)
    tone = "The candidate demonstrates reasonable intent but several responses suggest a preference for working around problems rather than surfacing them early. May benefit from coaching on proactive communication.";
  else
    tone = "The candidate's responses indicate a tendency toward individual solutions over team communication in challenging situations. Further discussion during interview is recommended.";

  if (hasWritten)
    tone += " The candidate also provided written reflections, which offer additional context for the interview panel.";
  return tone;
}

function overallVerdict(scorePercent: number): { label: string; color: string; summary: string } {
  if (scorePercent >= 80)
    return {
      label: "Strong",
      color: "emerald",
      summary: "This candidate stands out with high scores across both technical knowledge and professional attitude. Recommended for prioritisation in the next interview round.",
    };
  if (scorePercent >= 65)
    return {
      label: "Good",
      color: "blue",
      summary: "This candidate performed well overall. Minor gaps exist but the profile is solid — worth progressing to interview.",
    };
  if (scorePercent >= 50)
    return {
      label: "Average",
      color: "amber",
      summary: "This candidate met the baseline in most areas but did not stand out. Interview should probe the identified weaker areas before a hiring decision.",
    };
  return {
    label: "Below average",
    color: "red",
    summary: "This candidate scored below expectations in one or more key areas. Proceeding to interview is at the hiring team's discretion.",
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function ReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const sb = supabaseService();

  const { data: candidate } = await sb
    .from("candidates")
    .select("id, name, status, created_at, started_at, submitted_at, expected_salary, expected_salary_currency, shortlisted, admin_notes, cv_path")
    .eq("token", token)
    .maybeSingle();

  if (!candidate) notFound();
  if (candidate.status !== "submitted" && candidate.status !== "expired") {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <div className="text-4xl">⏳</div>
          <h1 className="text-xl font-semibold">Assessment not yet submitted</h1>
          <p className="text-gray-500 dark:text-neutral-400 text-sm">
            This report will be available once the candidate has completed the assessment.
          </p>
        </div>
      </main>
    );
  }

  // ── CV signed URL (valid for 1 hour) ────────────────────────────────────────
  let cvDownloadUrl: string | null = null;
  if (candidate.cv_path) {
    const { data: signed } = await sb.storage
      .from("cvs")
      .createSignedUrl(candidate.cv_path, 60 * 60);
    cvDownloadUrl = signed?.signedUrl ?? null;
  }

  const { data: responses } = await sb
    .from("responses")
    .select("question_id, answer, auto_score")
    .eq("candidate_id", candidate.id);

  const answerMap = new Map((responses ?? []).map((r) => [r.question_id, r] as const));

  // ── Scores ──────────────────────────────────────────────────────────────────
  const knowledgeScore = knowledgeMCQs.reduce(
    (acc, q) => acc + (answerMap.get(q.id)?.auto_score ?? 0), 0
  );
  const attitudeScore = attitudeMCQs.reduce(
    (acc, q) => acc + (answerMap.get(q.id)?.auto_score ?? 0), 0
  );
  const totalScore = knowledgeScore + attitudeScore;
  const scorePercent = Math.round((totalScore / TOTAL_MAX) * 100);
  const verdict = overallVerdict(scorePercent);

  // ── Topic breakdown ─────────────────────────────────────────────────────────
  const topicResults = TOPIC_GROUPS.map(({ label, ids }) => {
    const max = ids.length;
    const score = ids.reduce((acc, id) => acc + (answerMap.get(id)?.auto_score ?? 0), 0);
    return { label, score, max };
  });

  // ── Written answers ─────────────────────────────────────────────────────────
  const writtenAnswers = QUESTIONS.filter((q) => q.type === "text" && q.section === "attitude")
    .map((q) => ({ prompt: q.prompt, answer: answerMap.get(q.id)?.answer ?? null }))
    .filter((a) => a.answer && a.answer.trim().length > 0);

  const hasWritten = writtenAnswers.length > 0;

  // ── Summaries ───────────────────────────────────────────────────────────────
  const knowledgeSummaryText = knowledgeSummary(topicResults);
  const attitudeSummaryText = attitudeSummary(attitudeScore, ATTITUDE_MAX, hasWritten);

  const submittedDate = candidate.submitted_at
    ? new Date(candidate.submitted_at).toLocaleDateString("en-GB", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "—";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-neutral-100">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold tracking-widest text-emerald-500 uppercase mb-0.5">
              Generic Recruitment Portal
            </div>
            <div className="text-sm text-gray-500 dark:text-neutral-400">
              Senior Software Engineer — Backend · Assessment Report
            </div>
          </div>
          <div className="text-xs text-gray-400 dark:text-neutral-500 text-right">
            <div>Submitted</div>
            <div className="text-gray-700 dark:text-neutral-300">{submittedDate}</div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">

        {/* Candidate name + verdict pill */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{candidate.name}</h1>
            <p className="text-gray-500 dark:text-neutral-400 mt-1 text-sm">
              Candidate assessment summary
            </p>
          </div>
          <VerdictPill label={verdict.label} color={verdict.color} />
        </div>

        {/* Recruitment process */}
        <RecruitmentProcess submittedAt={candidate.submitted_at} />

        {/* CV download */}
        {cvDownloadUrl && (
          <div className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-5 py-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-neutral-800 shrink-0">
              <svg className="w-5 h-5 text-gray-500 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-neutral-200">
                {candidate.cv_path!.split("/").pop()}
              </p>
              <p className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5">CV / Résumé</p>
            </div>
            <a
              href={cvDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 dark:bg-neutral-100 hover:bg-gray-700 dark:hover:bg-neutral-300 px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download CV
            </a>
          </div>
        )}

        {/* Expected salary — always visible */}
        <ScoreCard
          label="Expected salary"
          value={
            candidate.expected_salary != null
              ? `${candidate.expected_salary_currency ?? ""} ${Number(candidate.expected_salary).toLocaleString()}`
              : "—"
          }
          sub={candidate.shortlisted === true ? "✓ Shortlisted" : candidate.shortlisted === false ? "✗ Not shortlisted" : "Decision pending"}
          color={candidate.shortlisted === true ? "emerald" : candidate.shortlisted === false ? "red" : "neutral"}
        />

        {/* Collapsible details — score cards + all analysis sections */}
        <ExpandableDetails>

        {/* Score cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ScoreCard
            label="Overall score"
            value={`${totalScore} / ${TOTAL_MAX}`}
            sub={`${scorePercent}%`}
            color={verdict.color}
            large
          />
          <ScoreCard
            label="Knowledge"
            value={`${knowledgeScore} / ${KNOWLEDGE_MAX}`}
            sub={`${Math.round((knowledgeScore / KNOWLEDGE_MAX) * 100)}%`}
            color={knowledgeScore / KNOWLEDGE_MAX >= 0.75 ? "emerald" : knowledgeScore / KNOWLEDGE_MAX >= 0.5 ? "amber" : "red"}
          />
          <ScoreCard
            label="Attitude"
            value={`${attitudeScore} / ${ATTITUDE_MAX}`}
            sub={`${Math.round((attitudeScore / ATTITUDE_MAX) * 100)}%`}
            color={attitudeScore / ATTITUDE_MAX >= 0.75 ? "emerald" : attitudeScore / ATTITUDE_MAX >= 0.5 ? "amber" : "red"}
          />
        </section>

        {/* Overall verdict summary */}
        <section className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-6">
          <h2 className="text-xs font-semibold tracking-widest uppercase text-gray-400 dark:text-neutral-500 mb-3">
            Overall Assessment
          </h2>
          <p className="text-gray-800 dark:text-neutral-200 leading-relaxed">{verdict.summary}</p>
        </section>

        {/* Knowledge section */}
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-lg">Knowledge</h2>
            <span className="text-xs text-gray-400 dark:text-neutral-500">
              {knowledgeScore}/{KNOWLEDGE_MAX} · {Math.round((knowledgeScore / KNOWLEDGE_MAX) * 100)}%
            </span>
          </div>

          {/* Topic bars */}
          <div className="grid sm:grid-cols-2 gap-3">
            {topicResults.map(({ label, score, max }) => {
              const pct = Math.round((score / max) * 100);
              const barColor =
                pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400";
              return (
                <div key={label} className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">{label}</span>
                    <span className="text-gray-500 dark:text-neutral-400">{score}/{max}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-neutral-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 dark:text-neutral-500 mt-1">{pct}%</div>
                </div>
              );
            })}
          </div>

          {/* Knowledge summary text */}
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-5">
            <h3 className="text-xs font-semibold tracking-widest uppercase text-gray-400 dark:text-neutral-500 mb-2">
              Knowledge Summary
            </h3>
            <p className="text-gray-800 dark:text-neutral-200 text-sm leading-relaxed">
              {knowledgeSummaryText}
            </p>
          </div>
        </section>

        {/* Attitude section */}
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-lg">Professional Attitude</h2>
            <span className="text-xs text-gray-400 dark:text-neutral-500">
              {attitudeScore}/{ATTITUDE_MAX} · {Math.round((attitudeScore / ATTITUDE_MAX) * 100)}%
            </span>
          </div>

          {/* Attitude score bar */}
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Behavioral judgment score</span>
              <span className="text-gray-500 dark:text-neutral-400">{attitudeScore}/{ATTITUDE_MAX}</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-neutral-800 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  attitudeScore / ATTITUDE_MAX >= 0.75
                    ? "bg-emerald-500"
                    : attitudeScore / ATTITUDE_MAX >= 0.5
                    ? "bg-amber-400"
                    : "bg-red-400"
                }`}
                style={{ width: `${Math.round((attitudeScore / ATTITUDE_MAX) * 100)}%` }}
              />
            </div>
          </div>

          {/* Attitude summary text */}
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-5">
            <h3 className="text-xs font-semibold tracking-widest uppercase text-gray-400 dark:text-neutral-500 mb-2">
              Attitude Summary
            </h3>
            <p className="text-gray-800 dark:text-neutral-200 text-sm leading-relaxed">
              {attitudeSummaryText}
            </p>
          </div>

          {/* Written responses */}
          {writtenAnswers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-neutral-400">
                Written Responses
              </h3>
              {writtenAnswers.map(({ prompt, answer }, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-5"
                >
                  <p className="text-xs text-gray-400 dark:text-neutral-500 mb-2">{prompt}</p>
                  <p className="text-sm text-gray-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed">
                    {answer}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Admin notes (if set) */}
        {candidate.admin_notes && (
          <section className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-xl p-5">
            <h2 className="text-xs font-semibold tracking-widest uppercase text-amber-600 dark:text-amber-400 mb-2">
              Hiring Team Notes
            </h2>
            <p className="text-sm text-gray-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed">
              {candidate.admin_notes}
            </p>
          </section>
        )}

        </ExpandableDetails>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-neutral-800 pt-6 text-xs text-gray-400 dark:text-neutral-500 flex flex-col sm:flex-row justify-between gap-2">
          <span>
            This report is confidential and intended for Generic hiring personnel only.
          </span>
          <span>Generic Recruitment Portal · {new Date().getFullYear()}</span>
        </footer>
      </main>
    </div>
  );
}

// ── Recruitment process timeline ──────────────────────────────────────────────

function fmt(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

const PROCESS_STEPS: { label: string; done: boolean }[] = [
  { label: "CV Shortlisted",                  done: true  },
  { label: "Online assessment submitted",      done: true  },
  { label: "Phone call interview done",        done: true  },
  { label: "Shortlisted",                      done: true  },
  { label: "Referred to Senior Management",    done: false },
];

function RecruitmentProcess({ submittedAt }: { submittedAt: string | null }) {
  return (
    <section className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-6">
      <h2 className="text-xs font-semibold tracking-widest uppercase text-gray-400 dark:text-neutral-500 mb-6">
        Recruitment Process
      </h2>

      {/* Desktop: horizontal stepper */}
      <div className="hidden sm:flex items-start">
        {PROCESS_STEPS.map((step, i) => {
          const isLast = i === PROCESS_STEPS.length - 1;
          const date = i === 1 ? fmt(submittedAt) : null;
          return (
            <div key={step.label} className="flex-1 flex flex-col items-center relative">
              {!isLast && (
                <div className={`absolute top-4 left-1/2 w-full h-0.5 ${step.done ? "bg-emerald-500" : "bg-gray-200 dark:bg-neutral-700"}`} style={{ left: "50%", width: "100%" }} />
              )}
              <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                step.done
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "bg-amber-50 dark:bg-amber-900/20 border-amber-400 dark:border-amber-500"
              }`}>
                {step.done ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                )}
              </div>
              <div className="mt-3 text-center px-1">
                <p className={`text-xs font-semibold ${step.done ? "text-gray-800 dark:text-neutral-200" : "text-amber-500 dark:text-amber-400"}`}>
                  {step.label}
                </p>
                {date && <p className="text-[11px] text-gray-400 dark:text-neutral-500 mt-0.5">{date}</p>}
                {!step.done && <p className="text-[11px] text-amber-500 dark:text-amber-400 font-medium mt-0.5">Pending</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical list */}
      <div className="flex sm:hidden flex-col">
        {PROCESS_STEPS.map((step, i) => {
          const isLast = i === PROCESS_STEPS.length - 1;
          const date = i === 1 ? fmt(submittedAt) : null;
          return (
            <div key={step.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full border-2 shrink-0 ${
                  step.done
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "bg-amber-50 dark:bg-amber-900/20 border-amber-400 dark:border-amber-500"
                }`}>
                  {step.done ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                  )}
                </div>
                {!isLast && <div className={`w-0.5 flex-1 my-1 ${step.done ? "bg-emerald-500" : "bg-gray-200 dark:bg-neutral-700"}`} />}
              </div>
              <div className="pb-5">
                <p className={`text-sm font-semibold leading-tight ${step.done ? "text-gray-800 dark:text-neutral-200" : "text-amber-500 dark:text-amber-400"}`}>
                  {step.label}
                </p>
                {date && <p className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5">{date}</p>}
                {!step.done && <p className="text-xs text-amber-500 dark:text-amber-400 font-medium mt-0.5">Pending</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── UI helpers ────────────────────────────────────────────────────────────────

type Color = "emerald" | "blue" | "amber" | "red" | "neutral";

function VerdictPill({ label, color }: { label: string; color: string }) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    blue:    "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    amber:   "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    red:     "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    neutral: "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700",
  };
  return (
    <span className={`inline-block rounded-full px-4 py-1.5 text-sm font-semibold border ${map[color] ?? map.neutral}`}>
      {label}
    </span>
  );
}

function ScoreCard({
  label,
  value,
  sub,
  color,
  large,
}: {
  label: string;
  value: string;
  sub?: string;
  color: Color | string;
  large?: boolean;
}) {
  const textColors: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-500",
    blue:    "text-blue-600 dark:text-blue-400",
    amber:   "text-amber-600 dark:text-amber-400",
    red:     "text-red-600 dark:text-red-400",
    neutral: "text-gray-900 dark:text-neutral-100",
  };
  return (
    <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
      <div className="text-xs text-gray-400 dark:text-neutral-500 mb-2">{label}</div>
      <div className={`font-bold ${large ? "text-2xl" : "text-xl"} ${textColors[color] ?? "text-neutral-200"}`}>
        {value}
      </div>
      {sub && (
        <div className="text-xs text-gray-400 dark:text-neutral-500 mt-1">{sub}</div>
      )}
    </div>
  );
}
