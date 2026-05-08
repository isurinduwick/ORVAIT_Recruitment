import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

type CandidateStat = {
  job_role_id: string | null;
  status: string;
  shortlisted: boolean | null;
};

export default async function AdminHome() {
  if (!(await isAdmin())) redirect("/admin/login");
  const sb = supabaseService();

  const [{ data: roles }, { data: candidates }] = await Promise.all([
    sb
      .from("job_roles")
      .select("id, title, description, created_at, questions")
      .order("created_at", { ascending: false }),
    sb.from("candidates").select("job_role_id, status, shortlisted"),
  ]);

  const candidateList: CandidateStat[] = (candidates ?? []) as CandidateStat[];


  const statsRecord: Record<string, { total: number; submitted: number; shortlisted: number; in_progress: number }> = {};
  for (const c of candidateList) {
    if (!c.job_role_id) continue;
    const s = statsRecord[c.job_role_id] ?? { total: 0, submitted: 0, shortlisted: 0, in_progress: 0 };
    s.total++;
    if (c.status === "submitted") s.submitted++;
    if (c.status === "in_progress") s.in_progress++;
    if (c.shortlisted === true) s.shortlisted++;
    statsRecord[c.job_role_id] = s;
  }

  const roleList = (roles ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description as string | null,
    created_at: r.created_at,
    questionCount: Array.isArray(r.questions) ? r.questions.length : 0,
    questions: Array.isArray(r.questions) ? r.questions : [],
    stats: statsRecord[r.id] ?? { total: 0, submitted: 0, shortlisted: 0, in_progress: 0 },
  }));

  return (
    <DashboardClient
      roles={roleList}
    />
  );
}
