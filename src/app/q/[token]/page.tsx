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

    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full">
          {/* Brand bar */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wider uppercase mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Proctored Assessment
            </div>
            <h1 className="text-2xl font-bold text-white">{roleTitle}</h1>
            <p className="text-neutral-400 text-sm mt-1">
              Welcome, <span className="text-neutral-200 font-medium">{candidate.name}</span>
            </p>
          </div>

          {/* Main card */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 backdrop-blur shadow-2xl overflow-hidden">
            {/* Card header accent */}
            <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

            <div className="p-6 space-y-5">
              <p className="text-neutral-300 text-sm leading-relaxed">
                This questionnaire covers your knowledge, approach to work, and salary expectations.
                Once started, the timer cannot be paused.
              </p>

              {/* Rules grid */}
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    icon: "⏱",
                    text: (
                      <>
                        You have <strong className="text-white">{TIME_LIMIT_MINUTES} minutes</strong> from the moment you click Start.
                      </>
                    ),
                  },
                  {
                    icon: "📝",
                    text: (
                      <>
                        <strong className="text-white">{nonOptionalCount} required questions</strong> plus salary expectation.
                      </>
                    ),
                  },
                  {
                    icon: "🔒",
                    text: "You cannot pause, restart, or return to this assessment.",
                  },
                  {
                    icon: "✏️",
                    text: "Partial answers are accepted — do your honest best.",
                  },
                ].map((r, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl bg-neutral-800/60 px-4 py-3">
                    <span className="text-base shrink-0 mt-0.5">{r.icon}</span>
                    <p className="text-sm text-neutral-300 leading-snug">{r.text}</p>
                  </div>
                ))}
              </div>

              {/* Integrity notice */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-base">⚠️</span>
                  <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">Integrity Notice</p>
                </div>
                <ul className="space-y-1.5 text-xs text-amber-200/80 leading-relaxed">
                  {[
                    "All answers must be your own — do not use AI tools (ChatGPT, Copilot, Gemini, etc.) to generate responses.",
                    "Do not search the internet or copy answers from any external source.",
                    "Copying, pasting, and right-clicking are disabled and logged during the assessment.",
                    "Suspicious behaviour (tab switching, screen capture, devtools) is monitored and reviewed.",
                    "Dishonest answers result in immediate disqualification from the process.",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-500 shrink-0 mt-0.5">›</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <form action={start}>
                <SubmitButton
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-3 font-semibold text-white text-sm transition-all shadow-lg shadow-emerald-900/40 hover:shadow-emerald-800/50"
                  loadingText="Starting assessment…"
                >
                  Start {TIME_LIMIT_MINUTES}-minute assessment →
                </SubmitButton>
              </form>
            </div>
          </div>

          <p className="text-center text-xs text-neutral-600 mt-6">
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Top gradient accent */}
      <div className="h-0.5 w-full bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-500 fixed top-0 left-0 z-20" />

      {/* Header */}
      <header className="sticky top-0.5 z-10 border-b border-neutral-800/80 bg-neutral-950/95 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-100 truncate">{roleTitle}</p>
            <p className="text-xs text-neutral-500 truncate">{candidate.name}</p>
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
        <div className="max-w-3xl mx-auto px-5 py-2.5 flex items-center gap-2.5 text-xs text-amber-300/80">
          <span className="shrink-0">⚠️</span>
          <span>
            <span className="font-semibold text-amber-300">Integrity active:</span> Copying, pasting, right-click,
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
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-500 select-none">
                    LKR
                  </span>
                  <input
                    type="number"
                    name="expected_salary"
                    required
                    min={1}
                    placeholder="e.g. 150000"
                    className="w-full rounded-xl bg-neutral-900 border border-neutral-700 pl-12 pr-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-all"
                  />
                </div>
                <input type="hidden" name="expected_salary_currency" value="LKR" />
                <span className="text-sm text-neutral-500 whitespace-nowrap shrink-0">/ month</span>
              </div>
              <textarea
                name="salary_notes"
                rows={3}
                placeholder="Any notes on negotiability, perks, or other expectations?"
                className="w-full rounded-xl bg-neutral-900 border border-neutral-700 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-all resize-none"
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
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl border border-neutral-800 bg-neutral-900/80 backdrop-blur shadow-2xl overflow-hidden">
        <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
        <div className="p-8">
          <div className={`text-3xl mb-4 ${iconColor}`}>{icon}</div>
          <h1 className="text-xl font-bold text-neutral-100">{title}</h1>
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
      <div className="border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{icon}</span>
          <h2 className="text-base font-bold text-neutral-100">{title}</h2>
        </div>
        {description && (
          <p className="text-xs text-neutral-500 mt-1 ml-8">{description}</p>
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
    <li className="rounded-2xl border border-neutral-800 bg-neutral-900/60 overflow-hidden">
      {/* Question header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div
            className={`shrink-0 rounded-lg border px-2 py-0.5 text-xs font-bold font-mono ${accentColor}`}
          >
            {String(index).padStart(2, "0")}
          </div>
          <p className="text-sm text-neutral-200 leading-relaxed select-none flex-1">
            {q.prompt}
            {q.optional && (
              <span className="ml-2 text-xs text-neutral-600 border border-neutral-700 rounded-md px-1.5 py-0.5">
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
                  text-neutral-400 border border-transparent
                  hover:bg-neutral-800/80 hover:text-neutral-200 hover:border-neutral-700
                  has-[:checked]:bg-emerald-500/10 has-[:checked]:text-emerald-200 has-[:checked]:border-emerald-500/30
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
            className="w-full rounded-xl bg-neutral-950/80 border border-neutral-700 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600
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
