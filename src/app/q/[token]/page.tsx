import { notFound } from "next/navigation";
import { supabaseService } from "@/lib/supabase";
import { QUESTIONS, TIME_LIMIT_MINUTES, type Question } from "@/lib/questions";
import { startAssessment, submitAssessment } from "./actions";
import { Countdown } from "./countdown";
import { ThemeToggle } from "@/components/theme-toggle";
import { SubmitButton } from "@/components/submit-button";
import { Proctoring } from "./proctoring";

export const dynamic = "force-dynamic";

type RoleQuestion = {
  id: string;
  type: "mcq" | "open";
  section: "knowledge" | "attitude";
  prompt: string;
  options: { value: string; label: string }[];
  correct: string;
  optional: boolean;
};

function normalizeRoleQuestions(roleQs: RoleQuestion[]): Question[] {
  return roleQs.map((q): Question => {
    if (q.type === "mcq") {
      return {
        id: q.id,
        section: q.section,
        type: "mcq",
        prompt: q.prompt,
        options: q.options,
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

export default async function Questionnaire({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const sb = supabaseService();

  const { data: candidate } = await sb
    .from("candidates")
    .select("id, name, email, status, started_at, expires_at, submitted_at, job_role_id")
    .eq("token", token)
    .maybeSingle();

  if (!candidate) notFound();

  let roleTitle = "Assessment";
  let assessmentQuestions: Question[] = QUESTIONS;

  if (candidate.job_role_id) {
    const { data: role } = await sb
      .from("job_roles")
      .select("title, questions")
      .eq("id", candidate.job_role_id)
      .maybeSingle();

    if (role) {
      roleTitle = role.title;
      const rqs = role.questions as RoleQuestion[] | null;
      if (Array.isArray(rqs) && rqs.length > 0) {
        assessmentQuestions = normalizeRoleQuestions(rqs);
      }
    }
  }

  if (candidate.status === "submitted") {
    return (
      <StatusShell icon="✓" iconColor="text-emerald-400" title="Already submitted">
        <p className="text-neutral-400 mt-2 text-sm">
          Thank you, <span className="text-neutral-200 font-medium">{candidate.name}</span>.
          Your answers are in — we&apos;ll be in touch soon.
        </p>
      </StatusShell>
    );
  }

  if (
    candidate.status === "expired" ||
    (candidate.expires_at && new Date(candidate.expires_at).getTime() < Date.now())
  ) {
    return (
      <StatusShell icon="⏱" iconColor="text-amber-400" title="Time's up">
        <p className="text-neutral-400 mt-2 text-sm">
          The {TIME_LIMIT_MINUTES}-minute window for this assessment has ended.
          Contact{" "}
          <a href="mailto:hello@orvait.com" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
            hello@orvait.com
          </a>{" "}
          if you believe this is an error.
        </p>
      </StatusShell>
    );
  }

  // ── Not started yet ────────────────────────────────────────────────────────
  if (candidate.status === "invited") {
    async function start() {
      "use server";
      await startAssessment(token);
    }
    const nonOptionalCount = assessmentQuestions.filter((q) => !q.optional).length;

    const rules = [
      {
        iconEl: (
          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
          </svg>
        ),
        iconBg: "bg-emerald-500/10 border-emerald-500/20",
        label: "Time Limit",
        text: (<>You have <strong className="text-white font-semibold">{TIME_LIMIT_MINUTES} minutes</strong> from the moment you click Start</>),
      },
      {
        iconEl: (
          <svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        ),
        iconBg: "bg-sky-500/10 border-sky-500/20",
        label: "Questions",
        text: (<><strong className="text-white font-semibold">{nonOptionalCount} required questions</strong> plus salary expectation</>),
      },
      {
        iconEl: (
          <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        ),
        iconBg: "bg-amber-500/10 border-amber-500/20",
        label: "No Pausing",
        text: "You cannot pause, restart, or return to this assessment",
      },
      {
        iconEl: (
          <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        ),
        iconBg: "bg-violet-500/10 border-violet-500/20",
        label: "Partial Accepted",
        text: "Partial answers are accepted — do your honest best",
      },
    ];

    const integrityRules = [
      "All answers must be your own — do not use AI tools (ChatGPT, Copilot, Gemini, etc.) to generate responses.",
      "Do not search the internet or copy answers from any external source.",
      "Copying, pasting, and right-clicking are disabled and logged during the assessment.",
      "Suspicious behaviour (tab switching, screen capture, devtools) is monitored and reviewed.",
      "Dishonest answers result in immediate disqualification from the process.",
    ];

    return (
      <main className="min-h-screen bg-[#080c0a] text-neutral-100 flex items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full bg-emerald-900/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[300px] rounded-full bg-emerald-950/30 blur-3xl" />
        </div>
        {/* Top hairline */}
        <div className="pointer-events-none absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

        <div className="max-w-lg w-full relative z-10">
          {/* Header area */}
          <div className="mb-9 text-center space-y-4">
            {/* Brand mark */}
            <div className="inline-flex items-center gap-2.5 mb-1">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-neutral-500">ORVAIT</span>
            </div>

            {/* Proctored badge */}
            <div>
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-[0.18em] uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Proctored Assessment
              </span>
            </div>

            <div>
              <h1 className="text-[28px] font-bold text-white tracking-tight leading-tight">{roleTitle}</h1>
              <p className="text-neutral-500 text-sm mt-1.5">
                Welcome, <span className="text-neutral-300 font-medium">{candidate.name}</span>
              </p>
            </div>
          </div>

          {/* Main card */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-md shadow-[0_32px_64px_rgba(0,0,0,0.5)] overflow-hidden">
            {/* Top gradient accent */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

            <div className="p-6 space-y-5">
              <p className="text-neutral-400 text-[13px] leading-relaxed">
                This questionnaire covers your knowledge, approach to work, and salary expectations.
                Once started, the timer cannot be paused.
              </p>

              {/* Rules */}
              <div className="space-y-2">
                {rules.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3.5 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 hover:bg-white/[0.04] transition-colors duration-150"
                  >
                    <div className={`shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center ${r.iconBg}`}>
                      {r.iconEl}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 mb-0.5">{r.label}</p>
                      <p className="text-[13px] text-neutral-300 leading-snug">{r.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Integrity notice */}
              <div className="rounded-xl border border-amber-500/20 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/8 border-b border-amber-500/15">
                  <div className="shrink-0 w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">Integrity Notice</p>
                  <div className="ml-auto flex items-center gap-1.5 shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-[10px] text-amber-500/80 font-semibold">Monitoring Active</span>
                  </div>
                </div>
                <ul className="divide-y divide-amber-500/10">
                  {integrityRules.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 px-4 py-2.5 bg-amber-500/[0.03]">
                      <svg className="w-3 h-3 text-amber-500/60 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-[12px] text-amber-200/65 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <form action={start}>
                <SubmitButton
                  className="w-full rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 px-5 py-3.5 font-semibold text-white text-sm transition-all duration-200 shadow-lg shadow-emerald-950/60 hover:shadow-emerald-900/60 flex items-center justify-center gap-2"
                  loadingText="Starting assessment…"
                >
                  Begin {TIME_LIMIT_MINUTES}-Minute Assessment
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </SubmitButton>
              </form>
            </div>

            {/* Bottom hairline */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>

          <p className="text-center text-[11px] text-neutral-700 mt-5">
            By starting, you agree to complete this assessment honestly and without external assistance.
          </p>
        </div>
      </main>
    );
  }

  // ── In progress ────────────────────────────────────────────────────────────
  const expiresAtMs = candidate.expires_at
    ? new Date(candidate.expires_at).getTime()
    : Date.now() + TIME_LIMIT_MINUTES * 60 * 1000;

  const knowledgeQs = assessmentQuestions.filter((q) => q.section === "knowledge");
  const attitudeQs = assessmentQuestions.filter((q) => q.section === "attitude");

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* Top gradient accent */}
      <div className="h-0.5 w-full bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-500 fixed top-0 left-0 z-20" />

      {/* Header */}
      <header className="sticky top-0.5 z-10 border-b border-gray-200/80 dark:border-neutral-800/80 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-neutral-100 truncate">{roleTitle}</p>
            <p className="text-xs text-gray-500 dark:text-neutral-500 truncate">{candidate.name}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle />
            <Countdown expiresAtMs={expiresAtMs} />
          </div>
        </div>
      </header>

      <Proctoring token={token} />

      {/* Integrity ribbon */}
      <div className="border-b border-amber-500/20 bg-amber-500/5">
        <div className="max-w-3xl mx-auto px-5 py-2.5 flex items-center gap-2.5 text-xs text-amber-700 dark:text-amber-300/80">
          <span className="shrink-0">⚠️</span>
          <span>
            <span className="font-semibold text-amber-700 dark:text-amber-300">Integrity active:</span> Copying, pasting, right-click,
            and tab switching are monitored and blocked. Answer all questions in your own words.
          </span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-5 py-8">
        <form action={submitAssessment} className="space-y-10" id="qform">
          <input type="hidden" name="token" value={token} />

          {knowledgeQs.length > 0 && (
            <AssessmentSection
              title="Knowledge"
              icon="🧠"
              description="Choose or write the most accurate answer based on your professional knowledge."
            >
              <ol className="space-y-5">
                {knowledgeQs.map((q, i) => (
                  <QuestionItem key={q.id} index={i + 1} q={q} section="knowledge" />
                ))}
              </ol>
            </AssessmentSection>
          )}

          {attitudeQs.length > 0 && (
            <AssessmentSection
              title="Approach & Values"
              icon="💡"
              description="Describe how you think and operate in a professional environment."
            >
              <ol className="space-y-5">
                {attitudeQs.map((q, i) => (
                  <QuestionItem key={q.id} index={i + 1} q={q} section="attitude" />
                ))}
              </ol>
            </AssessmentSection>
          )}

          <AssessmentSection
            title="Salary Expectation"
            icon="💼"
            description="Your expected monthly compensation in LKR."
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 dark:text-neutral-500 select-none">
                    LKR
                  </span>
                  <input
                    type="number"
                    name="expected_salary"
                    required
                    min={1}
                    placeholder="e.g. 150000"
                    className="w-full rounded-xl bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 pl-12 pr-4 py-3 text-sm text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-all"
                  />
                </div>
                <input type="hidden" name="expected_salary_currency" value="LKR" />
                <span className="text-sm text-gray-500 dark:text-neutral-500 whitespace-nowrap shrink-0">/ month</span>
              </div>
              <textarea
                name="salary_notes"
                rows={3}
                placeholder="Any notes on negotiability, perks, or other expectations?"
                className="w-full rounded-xl bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 px-4 py-3 text-sm text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-all resize-none"
                autoComplete="off"
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
              />
            </div>
          </AssessmentSection>

          <div className="flex justify-end gap-3 pt-2 pb-8">
            <SubmitButton
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-7 py-3 font-semibold text-white text-sm transition-all shadow-lg shadow-emerald-900/40 hover:shadow-emerald-800/50"
              loadingText="Submitting…"
            >
              Submit assessment →
            </SubmitButton>
          </div>
        </form>
      </main>
    </div>
  );
}

// ── Shared components ──────────────────────────────────────────────────────────

function StatusShell({
  icon,
  iconColor,
  title,
  children,
}: {
  icon: string;
  iconColor: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-neutral-100 flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 backdrop-blur shadow-2xl overflow-hidden">
        <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
        <div className="p-8">
          <div className={`text-3xl mb-4 ${iconColor}`}>{icon}</div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-neutral-100">{title}</h1>
          {children}
        </div>
      </div>
    </main>
  );
}

function AssessmentSection({
  title,
  icon,
  description,
  children,
}: {
  title: string;
  icon: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="border-b border-gray-200 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{icon}</span>
          <h2 className="text-base font-bold text-gray-900 dark:text-neutral-100">{title}</h2>
        </div>
        {description && (
          <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1 ml-8">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function QuestionItem({
  index,
  q,
  section,
}: {
  index: number;
  q: Question;
  section: "knowledge" | "attitude";
}) {
  const accentColor =
    section === "knowledge"
      ? "bg-blue-500/15 text-blue-300 border-blue-500/20"
      : "bg-violet-500/15 text-violet-300 border-violet-500/20";

  return (
    <li className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 overflow-hidden">
      {/* Question header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div
            className={`shrink-0 rounded-lg border px-2 py-0.5 text-xs font-bold font-mono ${accentColor}`}
          >
            {String(index).padStart(2, "0")}
          </div>
          <p className="text-sm text-gray-800 dark:text-neutral-200 leading-relaxed select-none flex-1">
            {q.prompt}
            {q.optional && (
              <span className="ml-2 text-xs text-gray-500 dark:text-neutral-600 border border-gray-300 dark:border-neutral-700 rounded-md px-1.5 py-0.5">
                Optional
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Answer area */}
      <div className="px-5 pb-5">
        {q.type === "mcq" ? (
          <div className="space-y-2">
            {q.options.map((o) => (
              <label
                key={o.value}
                className="flex items-start gap-3 text-sm cursor-pointer rounded-xl px-4 py-3
                  text-gray-500 dark:text-neutral-400 border border-transparent
                  hover:bg-gray-100 dark:hover:bg-neutral-800/80 hover:text-gray-800 dark:hover:text-neutral-200 hover:border-gray-200 dark:hover:border-neutral-700
                  has-[:checked]:bg-emerald-500/10 has-[:checked]:text-emerald-700 dark:has-[:checked]:text-emerald-200 has-[:checked]:border-emerald-500/30
                  transition-all duration-150"
              >
                <input
                  type="radio"
                  name={q.id}
                  value={o.value}
                  className="mt-0.5 accent-emerald-500 shrink-0 w-4 h-4"
                />
                <span className="leading-snug">{o.label}</span>
              </label>
            ))}
          </div>
        ) : (
          <textarea
            name={q.id}
            rows={4}
            placeholder={"placeholder" in q ? (q as { placeholder?: string }).placeholder : "Write your answer here…"}
            className="w-full rounded-xl bg-gray-50 dark:bg-neutral-950/80 border border-gray-300 dark:border-neutral-700 px-4 py-3 text-sm text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-600
              focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60
              transition-all resize-none leading-relaxed"
            autoComplete="off"
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
          />
        )}
      </div>
    </li>
  );
}
