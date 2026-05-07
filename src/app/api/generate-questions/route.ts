import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { roleTitle, roleDescription } = await req.json();

  if (!roleTitle) {
    return NextResponse.json({ error: "roleTitle is required" }, { status: 400 });
  }

  const prompt = `You are an expert HR professional. Generate 6 assessment questions for a "${roleTitle}" position${roleDescription ? ` — ${roleDescription}` : ""}.

Return ONLY a valid JSON array. Each question must follow this exact schema:

For MCQ questions:
{
  "type": "mcq",
  "section": "knowledge" | "attitude",
  "prompt": "The question text",
  "options": [
    {"value": "a", "label": "First option"},
    {"value": "b", "label": "Second option"},
    {"value": "c", "label": "Third option"},
    {"value": "d", "label": "Fourth option"}
  ],
  "correct": "a",
  "optional": false
}

For open-ended questions:
{
  "type": "open",
  "section": "knowledge" | "attitude",
  "prompt": "The question text",
  "options": [],
  "correct": "",
  "optional": false
}

Rules:
- Generate 4 MCQ and 2 open-ended questions
- 3 questions in "knowledge" section (technical/role-specific)
- 3 questions in "attitude" section (soft skills/mindset)
- MCQ options must be plausible and professional
- The "correct" field must match one of the option values (a, b, c, or d)
- Return ONLY the JSON array, absolutely no other text`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0];
    if (raw.type !== "text") throw new Error("Unexpected response type");

    const text = raw.text.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
    const questions = JSON.parse(text);

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("Question generation error:", err);
    return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 });
  }
}
