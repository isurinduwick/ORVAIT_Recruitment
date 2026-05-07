import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase";
import { QUESTIONS } from "@/lib/questions";
import { addCandidate } from "./actions";
import { CopyLink } from "./copy-link";
import { SubmitButton } from "@/components/submit-button";
import { DeleteCandidateButton } from "./delete-button";

export const dynamic = "force-dynamic";

// Pre-compute which question IDs belong to which scored category
const knowledgeMCQIds = new Set(
  QUESTIONS.filter((q) => q.section === "knowledge" && q.type === "mcq").map((q) => q.id)
);
const attitudeMCQIds = new Set(
  QUESTIONS.filter((q) => q.section === "attitude" && q.type === "mcq").map((q) => q.id)
);
const KNOWLEDGE_MAX = knowledgeMCQIds.size;
const ATTITUDE_MAX = attitudeMCQIds.size;
const TOTAL_MAX = KNOWLEDGE_MAX + ATTITUDE_MAX;

type Row = {
  id: string;
  name: string;
  email: string;
  token: string;
  status: string;
  created_at: string;
  submitted_at: string | null;
  expected_salary: number | null;
  expected_salary_currency: string | null;
  attitude_rating: number | null;
  knowledge_rating: number | null;
  shortlisted: boolean | null;
  cv_path: string | null;
};

type ScoreSummary = {
  knowledge: number;
  attitude: number;
  total: number;
};

export default async function AdminHome() {
  if (!(await isAdmin())) redirect("/admin/login");
  const sb = supabaseService();

  const { data, error } = await sb
    .from("candidates")
    .select(
      "id, name, email, token, status, created_at, submitted_at, expected_salary, expected_salary_currency, attitude_rating, knowledge_rating, shortlisted, cv_path"
    )
    .order("created_at", { ascending: false });
  const rows: Row[] = (data ?? []) as Row[];

  const candidateIds = rows.map((r) => r.id);
  let scoreMap = new Map<string, ScoreSummary>();
  let flagMap = new Map<string, number>(); // candidate_id -> suspicious event count

  // Fetch suspicious event counts
  if (candidateIds.length > 0) {
    const { data: suspiciousData } = await sb
      .from("suspicious_events")
      .select("candidate_id, event_type")
      .in("candidate_id", candidateIds)
      .not("event_type", "in", '("tab_visible","window_focus")'); // exclude "returned" events
    if (suspiciousData) {
      for (const ev of suspiciousData) {
        flagMap.set(ev.candidate_id, (flagMap.get(ev.candidate_id) ?? 0) + 1);
      }
    }
  }

  // Fetch all MCQ responses for all candidates in one query

  if (candidateIds.length > 0) {
    const { data: allResponses } = await sb
      .from("responses")
      .select("candidate_id, question_id, auto_score")
      .in("candidate_id", candidateIds)
      .not("auto_score", "is", null);

    if (allResponses) {
      for (const row of rows) {
        const rr = allResponses.filter((r) => r.candidate_id === row.id);
        const knowledge = rr
          .filter((r) => knowledgeMCQIds.has(r.question_id))
          .reduce((acc, r) => acc + (r.auto_score ?? 0), 0);
        const attitude = rr
          .filter((r) => attitudeMCQIds.has(r.question_id))
          .reduce((acc, r) => acc + (r.auto_score ?? 0), 0);
        scoreMap.set(row.id, { knowledge, attitude, total: knowledge + attitude });
      }
    }
  }

  return (
    <div className="space-y-8">
      {/* Score legend */}
      <div className="flex gap-4 text-xs text-gray-400 dark:text-neutral-500 border border-neutral-800 rounded-lg px-4 py-2 bg-neutral-900 w-fit">
        <span>Scoring: Knowledge MCQ <strong className="text-gray-700 dark:text-neutral-300">{KNOWLEDGE_MAX} pts</strong></span>
        <span>·</span>
        <span>Attitude MCQ <strong className="text-gray-700 dark:text-neutral-300">{ATTITUDE_MAX} pts</strong></span>
        <span>·</span>
        <span>Total <strong className="text-gray-700 dark:text-neutral-300">{TOTAL_MAX} pts</strong></span>
      </div>

      <section className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-5">
        <h2 className="font-semibold mb-3">Add candidate</h2>
        <form action={addCandidate} className="grid md:grid-cols-[1fr_1fr_auto] gap-3">
          <input
            name="name"
            required
            placeholder="Full name"
            className="rounded-md bg-gray-100 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="candidate@example.com"
            className="rounded-md bg-gray-100 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <SubmitButton
            className="rounded-md bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-medium text-white"
            loadingText="Generating…"
          >
            Generate invite
          </SubmitButton>
        </form>
        {error && (
          <p className="text-xs text-red-400 mt-2">Error: {error.message}</p>
        )}
      </section>

      <section>
        <h2 className="font-semibold mb-3">Candidates ({rows.length})</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-neutral-500">No candidates yet. Add one above.</p>
        ) : (
          <div className="overflow-x-auto border border-neutral-800 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-neutral-900 text-gray-500 dark:text-neutral-400 text-left">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Salary</th>
                  <th className="px-3 py-2">Admin rating</th>
                  <th className="px-3 py-2">Shortlist</th>
                  <th className="px-3 py-2">CV</th>
                  <th className="px-3 py-2">Invite link</th>
                  <th className="px-3 py-2">Flags</th>
                  <th className="px-3 py-2">Review</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const score = scoreMap.get(r.id);
                  return (
                    <tr key={r.id} className="border-t border-gray-200 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-900/40">
                      <td className="px-3 py-2 font-medium">{r.name}</td>
                      <td className="px-3 py-2 text-neutral-400">{r.email}</td>
                      <td className="px-3 py-2">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="px-3 py-2">
                        {score ? (
                          <div>
                            <span className={`font-semibold ${scoreColor(score.total, TOTAL_MAX)}`}>
                              {score.total}/{TOTAL_MAX}
                            </span>
                            <span className="text-gray-400 dark:text-neutral-500 text-xs ml-2">
                              K {score.knowledge}/{KNOWLEDGE_MAX} · A {score.attitude}/{ATTITUDE_MAX}
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-neutral-300">
                        {r.expected_salary != null
                          ? `${r.expected_salary_currency ?? ""} ${Number(r.expected_salary).toLocaleString()}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-neutral-300">
                        {r.attitude_rating || r.knowledge_rating
                          ? `A ${r.attitude_rating ?? "-"} / K ${r.knowledge_rating ?? "-"}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {r.shortlisted === true && <span className="text-emerald-400">✓ yes</span>}
                        {r.shortlisted === false && <span className="text-red-400">✗ no</span>}
                        {r.shortlisted == null && "—"}
                      </td>
                      <td className="px-3 py-2">
                        {r.cv_path ? (
                          <a
                            href={`/api/cv/${r.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Download CV"
                            className="inline-flex items-center gap-1 text-xs rounded-md bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700/50 px-2 py-1 text-emerald-300 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            CV
                          </a>
                        ) : (
                          <span className="text-neutral-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <CopyLink token={r.token} />
                      </td>
                      <td className="px-3 py-2">
                        {(() => {
                          const flags = flagMap.get(r.id) ?? 0;
                          if (flags === 0) return <span className="text-gray-300 dark:text-neutral-600 text-xs">—</span>;
                          return (
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                              flags >= 5 ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" :
                              "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300"
                            }`}>
                              ⚑ {flags}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/admin/candidate/${r.id}`}
                          className="text-emerald-400 hover:text-emerald-300"
                        >
                          Review →
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <DeleteCandidateButton id={r.id} name={r.name} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function scoreColor(score: number, max: number) {
  const pct = score / max;
  if (pct >= 0.75) return "text-emerald-400";
  if (pct >= 0.5) return "text-amber-400";
  return "text-red-400";
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    invited: "bg-neutral-700 text-neutral-200",
    in_progress: "bg-amber-900/60 text-amber-200",
    submitted: "bg-emerald-900/60 text-emerald-200",
    expired: "bg-red-900/60 text-red-200",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${colors[status] || "bg-neutral-700"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
