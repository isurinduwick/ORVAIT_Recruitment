import { notFound } from "next/navigation";
import { supabaseService } from "@/lib/supabase";
import { QUESTIONS, TIME_LIMIT_MINUTES } from "@/lib/questions";
import { startAssessment, submitAssessment } from "./actions";
import { Countdown } from "./countdown";
import { ThemeToggle } from "@/components/theme-toggle";
import { SubmitButton } from "@/components/submit-button";
import { Proctoring } from "./proctoring";

export const dynamic = "force-dynamic";

export default async function Questionnaire({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const sb = supabaseService();

  const { data: candidate } = await sb
    .from("candidates")
    .select("id, name, email, status, started_at, expires_at, submitted_at")
    .eq("token", token)
    .maybeSingle();

  if (!candidate) notFound();

  if (candidate.status === "submitted") {
    return (
      <InfoShell>
        <h1 className="text-2xl font-semibold">Already submitted</h1>
        <p className="text-gray-500 dark:text-neutral-400 mt-2">
          Thank you, {candidate.name}. Your answers are in — we&apos;ll be in touch.
        </p>
      </InfoShell>
    );
  }

  if (
    candidate.status === "expired" ||
    (candidate.expires_at &&
      new Date(candidate.expires_at).getTime() < Date.now())
  ) {
    return (
      <InfoShell>
        <h1 className="text-2xl font-semibold">Time&apos;s up</h1>
        <p className="text-gray-500 dark:text-neutral-400 mt-2">
          The {TIME_LIMIT_MINUTES}-minute window for this assessment has ended.
          Please contact hello@generic.com if you believe this is an error.
        </p>
      </InfoShell>
    );
  }

  // Not started yet — show intro + start button
  if (candidate.status === "invited") {
    async function start() {
      "use server";
      await startAssessment(token);
    }
    return (
      <InfoShell>
        <h1 className="text-2xl font-semibold">
          Senior Backend Engineer — Assessment
        </h1>
        <p className="text-gray-500 dark:text-neutral-400 mt-2">
          Welcome, {candidate.name}. This questionnaire covers your knowledge,
          approach to work, and salary expectations.
        </p>
        <ul className="mt-4 space-y-1 text-sm text-gray-700 dark:text-neutral-300 list-disc list-inside">
          <li>You will have <strong>{TIME_LIMIT_MINUTES} minutes</strong> from the moment you click start.</li>
          <li>{QUESTIONS.filter(q => !q.optional).length} questions + 2 optional written questions + salary expectations.</li>
          <li>You cannot pause or restart. Make sure you have a quiet block of time.</li>
          <li>Partial answers are fine — do your best.</li>
        </ul>

        {/* AI & integrity disclaimer */}
        <div className="mt-5 rounded-lg border border-amber-400/40 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">⚠️ Integrity notice</p>
          <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1 list-disc list-inside">
            <li>All answers must be your own — <strong>do not use AI tools</strong> (ChatGPT, Copilot, etc.) to generate responses.</li>
            <li>Do not search the internet or copy answers from external sources.</li>
            <li>Suspicious activity (tab switching, copy attempts, etc.) is logged and reviewed by the hiring team.</li>
            <li>Dishonest answers will result in immediate disqualification.</li>
          </ul>
        </div>

        <form action={start} className="mt-6">
          <SubmitButton
            className="rounded-md bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 font-medium text-white"
            loadingText="Starting…"
          >
            Start the {TIME_LIMIT_MINUTES}-minute assessment
          </SubmitButton>
        </form>
      </InfoShell>
    );
  }

  // In progress
  const expiresAtMs = candidate.expires_at
    ? new Date(candidate.expires_at).getTime()
    : Date.now() + TIME_LIMIT_MINUTES * 60 * 1000;

  const knowledgeQs = QUESTIONS.filter((q) => q.section === "knowledge");
  const attitudeQs = QUESTIONS.filter((q) => q.section === "attitude");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-neutral-100">
      <header className="sticky top-0 z-10 border-b border-gray-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Generic Assessment</p>
            <p className="text-xs text-gray-500 dark:text-neutral-400">{candidate.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Countdown expiresAtMs={expiresAtMs} />
          </div>
        </div>
      </header>

      <Proctoring token={token} />

      {/* Persistent AI integrity reminder */}
      <div className="border-b border-amber-400/30 bg-amber-50 dark:bg-amber-900/20">
        <div className="max-w-3xl mx-auto px-6 py-2 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
          <span>⚠️</span>
          <span><strong>Integrity reminder:</strong> Answer all questions yourself. Do not use AI tools, search engines, or external help. Suspicious activity is being monitored and logged.</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <form action={submitAssessment} className="space-y-10" id="qform">
          <input type="hidden" name="token" value={token} />

          <Section title="Knowledge">
            <ol className="space-y-6">
              {knowledgeQs.map((q, i) => (
                <QuestionItem key={q.id} index={i + 1} q={q} />
              ))}
            </ol>
          </Section>

          <Section title="Approach">
            <ol className="space-y-6">
              {attitudeQs.map((q, i) => (
                <QuestionItem key={q.id} index={i + 1} q={q} />
              ))}
            </ol>
          </Section>

          <Section title="Expected salary">
            <div className="flex items-center gap-3">
              <input
                type="number"
                name="expected_salary"
                required
                min={1}
                className="flex-1 rounded-md bg-gray-50 dark:bg-neutral-950 border border-gray-300 dark:border-neutral-700 px-3 py-2 text-sm"
              />
              <input type="hidden" name="expected_salary_currency" value="LKR" />
              <span className="text-sm text-gray-500 dark:text-neutral-400 whitespace-nowrap">LKR / month</span>
            </div>
            <textarea
              name="salary_notes"
              rows={3}
              placeholder="Any notes on salary, negotiability, expected perks?"
              className="mt-3 w-full rounded-md bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 px-3 py-2 text-sm"
            />
          </Section>

          <div className="flex justify-end gap-3 pt-2">
            <SubmitButton
              className="rounded-md bg-emerald-600 hover:bg-emerald-500 px-6 py-2.5 font-medium text-white"
              loadingText="Submitting…"
            >
              Submit assessment
            </SubmitButton>
          </div>
        </form>
      </main>
    </div>
  );
}

function InfoShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-neutral-100 flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-6">
        {children}
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-4 border-b border-gray-200 dark:border-neutral-800 pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function QuestionItem({
  index,
  q,
}: {
  index: number;
  q: (typeof QUESTIONS)[number];
}) {
  return (
    <li className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-gray-800 dark:text-neutral-200">
          <span className="text-gray-400 dark:text-neutral-500">Q{index}.</span> {q.prompt}
        </p>
        {q.optional && (
          <span className="shrink-0 text-xs text-gray-400 dark:text-neutral-500 border border-neutral-700 rounded px-1.5 py-0.5">
            Optional
          </span>
        )}
      </div>
      <div className="mt-3">
        {q.type === "mcq" ? (
          <div className="space-y-2">
            {q.options.map((o) => (
              <label
                key={o.value}
                className="flex items-start gap-2 text-sm cursor-pointer rounded-md px-2 py-1.5
                  text-gray-700 dark:text-neutral-300
                  hover:bg-gray-100 hover:text-gray-900
                  dark:hover:bg-neutral-800 dark:hover:text-neutral-100
                  has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-800 has-[:checked]:font-medium
                  dark:has-[:checked]:bg-emerald-900/20 dark:has-[:checked]:text-emerald-300 dark:has-[:checked]:font-medium"
              >
                <input
                  type="radio"
                  name={q.id}
                  value={o.value}
                  className="mt-0.5 accent-emerald-500 shrink-0"
                />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        ) : (
          <textarea
            name={q.id}
            rows={4}
            placeholder={q.placeholder}
            className="w-full rounded-md bg-gray-50 dark:bg-neutral-950 border border-gray-300 dark:border-neutral-700 px-3 py-2 text-sm"
          />
        )}
      </div>
    </li>
  );
}
