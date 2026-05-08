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

  const scoreMap = new Map<string, ScoreSummary>();
  const flagMap = new Map<string, number>();

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

      {/* ── Header ── */}
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-neutral-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors mb-4 group"
        >
          <svg className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          All Roles
        </Link>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{role.title}</h1>
            {role.description ? (
              <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1 max-w-xl leading-relaxed">{role.description}</p>
            ) : (
              <p className="text-sm italic text-gray-300 dark:text-neutral-600 mt-1">No description</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
        } label="Total Invited" value={rows.length} color="neutral" />
        <StatCard icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
        } label="In Progress" value={inProgress} color="amber" />
        <StatCard icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        } label="Submitted" value={submitted} color="blue" />
        <StatCard icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
        } label="Shortlisted" value={shortlisted} color="emerald" />
      </div>

      {/* ── Invite form ── */}
      <div className="relative bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-2xl pointer-events-none" />
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-sm shadow-emerald-500/30">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-sm">Invite a Candidate</h2>
            <p className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5">Generate a unique assessment link to send</p>
          </div>
        </div>
        <form action={addCandidate} className="grid md:grid-cols-[1fr_1fr_auto] gap-3">
          <input type="hidden" name="job_role_id" value={role.id} />
          <input
            name="name"
            required
            placeholder="Full name"
            className="rounded-xl bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-400 dark:placeholder:text-neutral-500 transition-shadow"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="candidate@example.com"
            className="rounded-xl bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-400 dark:placeholder:text-neutral-500 transition-shadow"
          />
          <SubmitButton
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-500/20 transition-all hover:shadow-emerald-500/30"
            loadingText="Generating…"
          >
            Generate Invite
          </SubmitButton>
        </form>
      </div>

      {/* ── Candidates ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-sm text-gray-900 dark:text-neutral-100">Candidates</h2>
            <p className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5">{rows.length} invited · {submitted} completed · {shortlisted} shortlisted</p>
          </div>
          {TOTAL_MAX > 0 && (
            <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-neutral-500">
              <span className="hidden sm:inline">Score out of</span>
              <span className="font-bold text-emerald-500">{TOTAL_MAX} pts</span>
              <span className="hidden sm:inline text-gray-300 dark:text-neutral-700">·</span>
              <span className="hidden sm:inline">K {KNOWLEDGE_MAX} · A {ATTITUDE_MAX}</span>
            </div>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-neutral-800 py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-neutral-800 dark:to-neutral-800/50 border border-gray-200 dark:border-neutral-700 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-300 dark:text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <p className="font-semibold text-gray-600 dark:text-neutral-300">No candidates yet</p>
            <p className="text-xs text-gray-400 dark:text-neutral-600 mt-1.5 max-w-xs">Use the form above to invite your first candidate and generate their unique assessment link.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const score = scoreMap.get(r.id);
              const flags = flagMap.get(r.id) ?? 0;
              const pct = score && TOTAL_MAX > 0 ? Math.round((score.total / TOTAL_MAX) * 100) : null;
              const initials = r.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
              const avatarColors = [
                "from-violet-500 to-purple-600",
                "from-emerald-500 to-cyan-500",
                "from-orange-500 to-amber-500",
                "from-blue-500 to-indigo-500",
                "from-pink-500 to-rose-500",
              ];
              const avatarColor = avatarColors[r.name.charCodeAt(0) % avatarColors.length];

              return (
                <div
                  key={r.id}
                  className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-4 hover:border-emerald-400/40 dark:hover:border-emerald-600/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-200"
                >
                  {/* ── Row 1: Identity + Status + Actions ── */}
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarColor} flex items-center justify-center shrink-0 shadow-sm`}>
                      <span className="text-white text-xs font-bold">{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 dark:text-neutral-100 truncate">{r.name}</div>
                      <div className="text-xs text-gray-400 dark:text-neutral-500 truncate">{r.email}</div>
                    </div>
                    <StatusPill status={r.status} />
                    <div className="flex items-center gap-2 shrink-0">
                      <CopyLink token={r.token} />
                      <Link
                        href={`/admin/candidate/${r.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 transition-all"
                      >
                        Review
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                      </Link>
                      <DeleteCandidateButton id={r.id} name={r.name} jobRoleId={role.id} />
                    </div>
                  </div>

                  {/* ── Row 2: Score + Shortlist + CV + Flags + Salary + Rating ── */}
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-neutral-800 flex items-center gap-3 flex-wrap">

                    {/* Score */}
                    {score ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-neutral-800 overflow-hidden w-20">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              pct! >= 75 ? "bg-gradient-to-r from-emerald-500 to-cyan-400" :
                              pct! >= 50 ? "bg-gradient-to-r from-amber-400 to-orange-400" :
                              "bg-gradient-to-r from-red-400 to-rose-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold ${scoreColor(score.total, TOTAL_MAX)}`}>
                          {score.total}<span className="font-normal text-gray-400 dark:text-neutral-600">/{TOTAL_MAX}</span>
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-neutral-500">K {score.knowledge} · A {score.attitude}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300 dark:text-neutral-600 italic">No score yet</span>
                    )}

                    <div className="w-px h-4 bg-gray-200 dark:bg-neutral-700" />

                    {/* Shortlist badge — always visible */}
                    {r.shortlisted === true && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                        <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                        Shortlisted
                      </span>
                    )}
                    {r.shortlisted === false && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400">
                        <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>
                        Rejected
                      </span>
                    )}
                    {r.shortlisted == null && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-400 dark:text-neutral-500">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Pending
                      </span>
                    )}

                    {/* CV download — always visible */}
                    {r.cv_path ? (
                      <a
                        href={`/api/cv/${r.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-700/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                        CV
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-300 dark:text-neutral-600">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                        No CV
                      </span>
                    )}

                    {/* Flag indicator — always visible */}
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      flags >= 5
                        ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300"
                        : flags > 0
                        ? "bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300"
                        : "bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400"
                    }`}>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 7l2.55 2.4A1 1 0 0116 11H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" /></svg>
                      {flags} Flag{flags !== 1 ? "s" : ""}
                    </span>

                    {/* Salary */}
                    {r.expected_salary != null && (
                      <span className="text-xs text-gray-500 dark:text-neutral-400 ml-auto">
                        <span className="text-gray-300 dark:text-neutral-600 mr-1">Salary</span>
                        <span className="font-semibold">{r.expected_salary_currency ?? ""} {Number(r.expected_salary).toLocaleString()}</span>
                      </span>
                    )}

                    {/* Admin rating */}
                    {(r.attitude_rating || r.knowledge_rating) && (
                      <span className="text-xs text-gray-500 dark:text-neutral-400">
                        <span className="text-gray-300 dark:text-neutral-600 mr-1">Rating</span>
                        <span className="font-semibold">A {r.attitude_rating ?? "—"} · K {r.knowledge_rating ?? "—"}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function scoreColor(score: number, max: number) {
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.75) return "text-emerald-500";
  if (pct >= 0.5) return "text-amber-500";
  return "text-red-500";
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    invited:     { label: "Invited",      cls: "bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400" },
    in_progress: { label: "In Progress",  cls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" },
    submitted:   { label: "Submitted",    cls: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
    expired:     { label: "Expired",      cls: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-neutral-100 dark:bg-neutral-800 text-gray-500" };
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "neutral" | "amber" | "blue" | "emerald";
}) {
  const styles = {
    neutral: { card: "bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800", icon: "bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400", value: "text-gray-900 dark:text-neutral-100" },
    amber:   { card: "bg-amber-50 dark:bg-amber-900/10 border-amber-200/60 dark:border-amber-800/30", icon: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400", value: "text-amber-600 dark:text-amber-400" },
    blue:    { card: "bg-blue-50 dark:bg-blue-900/10 border-blue-200/60 dark:border-blue-800/30", icon: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400", value: "text-blue-600 dark:text-blue-400" },
    emerald: { card: "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200/60 dark:border-emerald-800/30", icon: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400", value: "text-emerald-600 dark:text-emerald-400" },
  };
  const s = styles[color];
  return (
    <div className={`border rounded-2xl px-4 py-4 flex items-center gap-3 ${s.card}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.icon}`}>
        {icon}
      </div>
      <div>
        <p className={`text-2xl font-bold leading-none ${s.value}`}>{value}</p>
        <p className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-neutral-500 mt-1">{label}</p>
      </div>
    </div>
  );
}
