import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Message = { role: "user" | "model"; content: string };

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message, history = [] }: { message: string; history: Message[] } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
  }

  const sb = supabaseService();

  const [{ data: roles }, { data: candidates }, { data: responses }] = await Promise.all([
    sb.from("job_roles").select("id, title, description"),
    sb.from("candidates").select(
      "id, name, email, status, shortlisted, expected_salary, expected_salary_currency, knowledge_rating, attitude_rating, job_role_id, submitted_at, admin_notes"
    ),
    sb.from("responses").select("candidate_id, auto_score").not("auto_score", "is", null),
  ]);

  // Total score per candidate
  const scoreMap = new Map<string, number>();
  for (const r of responses ?? []) {
    scoreMap.set(r.candidate_id, (scoreMap.get(r.candidate_id) ?? 0) + (r.auto_score ?? 0));
  }

  const roleMap = new Map((roles ?? []).map((r) => [r.id, r.title]));

  const enriched = (candidates ?? []).map((c) => ({
    name: c.name,
    email: c.email,
    role: roleMap.get(c.job_role_id) ?? "Unknown Role",
    status: c.status,
    shortlisted: c.shortlisted === true ? "yes" : c.shortlisted === false ? "rejected" : "pending",
    autoScore: scoreMap.get(c.id) ?? 0,
    knowledgeRating: c.knowledge_rating ?? null,
    attitudeRating: c.attitude_rating ?? null,
    expectedSalary: c.expected_salary
      ? `${c.expected_salary_currency ?? "LKR"} ${Number(c.expected_salary).toLocaleString()}`
      : null,
    submittedAt: c.submitted_at ?? null,
    adminNotes: c.admin_notes ?? null,
  }));

  const systemPrompt = `You are a smart recruitment assistant for the ORVAIT Recruitment Portal. You help hiring managers make data-driven decisions about candidates.

Today's date: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}

=== JOB ROLES (${(roles ?? []).length}) ===
${JSON.stringify(roles?.map((r) => ({ title: r.title, description: r.description })), null, 2)}

=== CANDIDATES (${enriched.length}) ===
${JSON.stringify(enriched, null, 2)}

=== FIELD REFERENCE ===
- autoScore: total MCQ score (higher = better)
- status: invited | in_progress | submitted | expired
- shortlisted: yes | rejected | pending
- knowledgeRating / attitudeRating: 1–5 admin rating (null if not rated yet)

=== GUIDELINES ===
- Be concise, professional, and direct
- When asked about "best" candidates, rank by autoScore first, then knowledgeRating/attitudeRating
- Always mention candidate names and their scores/status
- For role-specific questions, filter by the matching role name
- If a candidate hasn't submitted (status ≠ submitted), note that they have no score yet
- Format lists clearly with bullet points or numbered lists
- Keep responses under 250 words unless a detailed breakdown is specifically requested`;

  const groqMessages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-12).map((m) => ({
      role: m.role === "model" ? "assistant" : "user",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        temperature: 0.6,
        max_tokens: 800,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message ?? `Groq error ${res.status}`);
    }

    const reply =
      data.choices?.[0]?.message?.content ??
      "Sorry, I couldn't generate a response. Please try again.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[chat] Groq error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI request failed" },
      { status: 500 }
    );
  }
}
