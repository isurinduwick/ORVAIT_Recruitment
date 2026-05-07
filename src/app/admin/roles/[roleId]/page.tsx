import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase";
import { QUESTIONS } from "@/lib/questions";
import { addCandidate } from "../../actions";
import { CopyLink } from "../../copy-link";
import { SubmitButton } from "@/components/submit-button";
import { DeleteCandidateButton } from "../../delete-button";

export const dynamic = "force-dynamic";

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

type ScoreSummary = { knowledge: number; attitude: number; total: number };

export default async function RoleDetail({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { roleId } = await params;
  const sb = supabaseService();

  const { data: role } = await sb
    .from("job_roles")
    .select("id, title, description")
    .eq("id", roleId)
    .maybeSingle();

  if (!role) notFound();

  const { data } = await sb
    .from("candidates")
    .select(
      "id, name, email, token, status, created_at, submitted_at, expected_salary, expected_salary_currency, attitude_rating, knowledge_rating, shortlisted, cv_path"
    )
    .eq("job_role_id", roleId)
    .order("created_at", { ascending: false });

  const rows: Row[] = (data ?? []) as Row[];
  const candidateIds = rows.map((r) => r.id);

  let scoreMap = new Map<string, ScoreSummary>();
  let flagMap = new Map<string, number>();

  if (candidateIds.length > 0) {
    const [{ data: suspiciousData }, { data: allResponses }] = await Promise.all([
      sb
        .from("suspicious_events")
        .select("candidate_id, event_type")
        .in("candidate_id", candidateIds)
        .not("event_type", "in", '("tab_visible","window_focus")'),
      sb
        .from("responses")
        .select("candidate_id, question_id, auto_score")
        .in("candidate_id", candidateIds)
        .not("auto_score", "is", null),
    ]);

    if (suspiciousData) {
      for (const ev of suspiciousData) {
        flagMap.set(ev.candidate_id, (flagMap.get(ev.candidate_id) ?? 0) + 1);
      }
    }

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

  const submitted = rows.filter((r) => r.status === "submitted").length;
  const shortlisted = rows.filter((r) => r.shortlisted === true).length;
  const inProgress = rows.filter((r) => r.status === "in_progress").length;

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-neutral-300 transition-colors mb-3"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            All Roles
          </Link>
          <h1 className="text-2xl font-bold">{role.title}</h1>
          {role.description && (
            <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">{role.description}</p>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Total Invited" value={rows.length} color="neutral" />
        <SummaryCard label="In Progress" value={inProgress} color="amber" />
        <SummaryCard label="Submitted" value={submitted} color="blue" />
        <SummaryCard label="Shortlisted" value={shortlisted} color="emerald" />
      </div>

      {/* Invite form */}
      <section className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
          </div>
          <h2 className="font-semibold text-sm">Invite Candidate</h2>
        </div>
        <form action={addCandidate} className="grid md:grid-cols-[1fr_1fr_auto] gap-3">
          <input type="hidden" name="job_role_id" value={role.id} />
          <input
            name="name"
            required
            placeholder="Full name"
            className="rounded-lg bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-400 dark:placeholder:text-neutral-500"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="candidate@example.com"
            className="rounded-lg bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-400 dark:placeholder:text-neutral-500"
          />
          <SubmitButton
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
            loadingText="Generating…"
          >
            Generate Invite
          </SubmitButton>
        </form>
      </section>

      {/* Scoring legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-neutral-700 px-3 py-1 text-gray-500 dark:text-neutral-400">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-neutral-500 inline-block" />
          Knowledge MCQ — {KNOWLEDGE_MAX} pts
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-neutral-700 px-3 py-1 text-gray-500 dark:text-neutral-400">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-neutral-500 inline-block" />
          Attitude MCQ — {ATTITUDE_MAX} pts
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/40 px-3 py-1 text-emerald-600 dark:text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          Total — {TOTAL_MAX} pts
        </span>
      </div>

      {/* Candidates table */}
      <section>
        <h2 className="font-semibold mb-3 text-sm text-gray-500 dark:text-neutral-400 uppercase tracking-widest">
          Candidates · {rows.length}
        </h2>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-neutral-800 py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-neutral-400">No candidates yet</p>
            <p className="text-xs text-gray-400 dark:text-neutral-600 mt-1">Use the form above to invite your first candidate.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 dark:border-neutral-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-neutral-800/60 text-xs text-gray-500 dark:text-neutral-400 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-medium">Candidate</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Score</th>
                  <th className="px-4 py-3 text-left font-medium">Salary</th>
                  <th className="px-4 py-3 text-left font-medium">Rating</th>
                  <th className="px-4 py-3 text-left font-medium">Shortlist</th>
                  <th className="px-4 py-3 text-left font-medium">CV</th>
                  <th className="px-4 py-3 text-left font-medium">Invite</th>
                  <th className="px-4 py-3 text-left font-medium">Flags</th>
                  <th className="px-4 py-3 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                {rows.map((r) => {
                  const score = scoreMap.get(r.id);
                  const flags = flagMap.get(r.id) ?? 0;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/40 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-neutral-100">{r.name}</div>
                        <div className="text-xs text-gray-400 dark:text-neutral-500">{r.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="px-4 py-3">
                        {score ? (
                          <div>
                            <span className={`font-bold ${scoreColor(score.total, TOTAL_MAX)}`}>
                              {score.total}
                              <span className="font-normal text-gray-400 dark:text-neutral-600">/{TOTAL_MAX}</span>
                            </span>
                            <div className="text-[10px] text-gray-400 dark:text-neutral-500 mt-0.5">
                              K {score.knowledge} · A {score.attitude}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-300 dark:text-neutral-700">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-neutral-300 text-xs">
                        {r.expected_salary != null
                          ? `${r.expected_salary_currency ?? ""} ${Number(r.expected_salary).toLocaleString()}`
                          : <span className="text-gray-300 dark:text-neutral-700">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-neutral-400">
                        {r.attitude_rating || r.knowledge_rating
                          ? `A ${r.attitude_rating ?? "-"} · K ${r.knowledge_rating ?? "-"}`
                          : <span className="text-gray-300 dark:text-neutral-700">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {r.shortlisted === true && (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                            Yes
                          </span>
                        )}
                        {r.shortlisted === false && (
                          <span className="inline-flex items-center gap-1 text-xs text-red-500 dark:text-red-400 font-medium">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>
                            No
                          </span>
                        )}
                        {r.shortlisted == null && <span className="text-gray-300 dark:text-neutral-700">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {r.cv_path ? (
                          <a
                            href={`/api/cv/${r.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs rounded-md bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-700/40 px-2 py-1 text-emerald-300 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            CV
                          </a>
                        ) : (
                          <span className="text-gray-300 dark:text-neutral-700 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <CopyLink token={r.token} />
                      </td>
                      <td className="px-4 py-3">
                        {flags === 0 ? (
                          <span className="text-gray-300 dark:text-neutral-700 text-xs">—</span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                            flags >= 5
                              ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300"
                              : "bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300"
                          }`}>
                            ⚑ {flags}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            href={`/admin/candidate/${r.id}`}
                            className="text-xs text-emerald-500 hover:text-emerald-400 font-medium whitespace-nowrap"
                          >
                            Review →
                          </Link>
                          <DeleteCandidateButton id={r.id} name={r.name} jobRoleId={role.id} />
                        </div>
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
  if (pct >= 0.75) return "text-emerald-500";
  if (pct >= 0.5) return "text-amber-500";
  return "text-red-500";
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    invited:     "bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400",
    in_progress: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    submitted:   "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
    expired:     "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || "bg-neutral-700"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: "neutral" | "amber" | "blue" | "emerald" }) {
  const styles = {
    neutral: "bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 text-gray-800 dark:text-neutral-100",
    amber:   "bg-amber-50 dark:bg-amber-900/10 border-amber-200/60 dark:border-amber-800/30 text-amber-600 dark:text-amber-400",
    blue:    "bg-blue-50 dark:bg-blue-900/10 border-blue-200/60 dark:border-blue-800/30 text-blue-600 dark:text-blue-400",
    emerald: "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200/60 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400",
  };
  return (
    <div className={`border rounded-xl px-4 py-3 ${styles[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-widest mt-0.5 opacity-60">{label}</p>
    </div>
  );
}
