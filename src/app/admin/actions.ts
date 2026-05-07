"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseService } from "@/lib/supabase";
import { isAdmin, signOutAdmin } from "@/lib/auth";

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function createJobRole(formData: FormData) {
  await requireAdmin();
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const questionsRaw = String(formData.get("questions") || "[]");
  if (!title) return;

  let questions = [];
  try { questions = JSON.parse(questionsRaw); } catch { /* ignore malformed */ }

  const sb = supabaseService();
  const { error } = await sb
    .from("job_roles")
    .insert({ title, description: description || null, questions });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function deleteJobRole(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const sb = supabaseService();
  const { error } = await sb.from("job_roles").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  redirect("/admin");
}

export async function addCandidate(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const job_role_id = String(formData.get("job_role_id") || "").trim() || null;
  if (!name || !email) return;
  const sb = supabaseService();
  const { error } = await sb.from("candidates").insert({ name, email, job_role_id });
  if (error) throw new Error(error.message);
  if (job_role_id) revalidatePath(`/admin/roles/${job_role_id}`);
  revalidatePath("/admin");
}

export async function logout() {
  await signOutAdmin();
  redirect("/admin/login");
}

export async function saveEvaluation(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const attitude = Number(formData.get("attitude_rating")) || null;
  const knowledge = Number(formData.get("knowledge_rating")) || null;
  const shortlistedRaw = String(formData.get("shortlisted") || "");
  const shortlisted =
    shortlistedRaw === "yes" ? true : shortlistedRaw === "no" ? false : null;
  const admin_notes = String(formData.get("admin_notes") || "");
  const sb = supabaseService();
  const { error } = await sb
    .from("candidates")
    .update({ attitude_rating: attitude, knowledge_rating: knowledge, shortlisted, admin_notes })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/candidate/${id}`);
  revalidatePath("/admin");
}

export async function deleteCandidate(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const job_role_id = String(formData.get("job_role_id") || "").trim() || null;
  const sb = supabaseService();
  const { error } = await sb.from("candidates").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (job_role_id) revalidatePath(`/admin/roles/${job_role_id}`);
  revalidatePath("/admin");
  redirect(job_role_id ? `/admin/roles/${job_role_id}` : "/admin");
}

export async function uploadCV(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "").trim();
  const file = formData.get("cv") as File | null;
  if (!id || !file || file.size === 0) return;

  const ext = (file.name.split(".").pop() ?? "pdf").toLowerCase();
  const allowed = ["pdf", "doc", "docx"];
  if (!allowed.includes(ext)) throw new Error("Only PDF, DOC, or DOCX files are accepted.");
  if (file.size > 10 * 1024 * 1024) throw new Error("File too large (max 10 MB).");

  const sb = supabaseService();
  const path = `${id}/cv.${ext}`;
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await sb.storage
    .from("cvs")
    .upload(path, Buffer.from(bytes), { contentType: file.type || "application/octet-stream", upsert: true });
  if (uploadError) throw new Error(uploadError.message);

  const { error: dbError } = await sb.from("candidates").update({ cv_path: path }).eq("id", id);
  if (dbError) throw new Error(dbError.message);
  revalidatePath(`/admin/candidate/${id}`);
  revalidatePath("/admin");
}

export async function deleteCV(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "").trim();
  const cvPath = String(formData.get("cv_path") || "").trim();
  if (!id || !cvPath) return;
  const sb = supabaseService();
  await sb.storage.from("cvs").remove([cvPath]);
  await sb.from("candidates").update({ cv_path: null }).eq("id", id);
  revalidatePath(`/admin/candidate/${id}`);
  revalidatePath("/admin");
}
