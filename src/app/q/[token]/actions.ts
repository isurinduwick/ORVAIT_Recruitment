"use server";

import { redirect } from "next/navigation";
import { supabaseService } from "@/lib/supabase";
import { QUESTIONS, TIME_LIMIT_MINUTES } from "@/lib/questions";

export async function startAssessment(token: string) {
  const sb = supabaseService();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TIME_LIMIT_MINUTES * 60 * 1000);

  const { data: c, error } = await sb
    .from("candidates")
    .select("id, status, started_at, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (error || !c) return;

  if (c.status === "invited") {
    await sb
      .from("candidates")
      .update({
        status: "in_progress",
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq("id", c.id);
  }

  // Always redirect back to the same URL so the page re-renders with the new status
  redirect(`/q/${token}`);
}

export async function submitAssessment(formData: FormData) {
  const token = String(formData.get("token") || "");
  const sb = supabaseService();

  const { data: c } = await sb
    .from("candidates")
    .select("id, status, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!c) return;
  if (c.status === "submitted") redirect(`/q/${token}/done`);

  const expired =
    c.expires_at && new Date(c.expires_at).getTime() < Date.now();

  // Save every answer
  const rows = QUESTIONS.map((q) => {
    const answer = String(formData.get(q.id) || "");
    let auto_score: number | null = null;
    if (q.type === "mcq" && q.correct) {
      auto_score = answer === q.correct ? 1 : 0;
    }
    return {
      candidate_id: c.id,
      question_id: q.id,
      answer,
      auto_score,
    };
  });

  await sb.from("responses").upsert(rows, {
    onConflict: "candidate_id,question_id",
  });

  const salaryRaw = String(formData.get("expected_salary") || "");
  const salary = salaryRaw ? Number(salaryRaw) : null;
  const currency = String(formData.get("expected_salary_currency") || "LKR");
  const salary_notes = String(formData.get("salary_notes") || "");

  await sb
    .from("candidates")
    .update({
      status: expired ? "expired" : "submitted",
      submitted_at: new Date().toISOString(),
      expected_salary: salary,
      expected_salary_currency: currency,
      salary_notes,
    })
    .eq("id", c.id);

  redirect(`/q/${token}/done`);
}
