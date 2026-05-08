import { NextRequest, NextResponse } from "next/server";
import { generateQuestions } from "@/lib/question-generator";

export async function POST(req: NextRequest) {
  const { roleTitle, roleDescription } = await req.json();

  if (!roleTitle) {
    return NextResponse.json({ error: "roleTitle is required" }, { status: 400 });
  }

  const questions = generateQuestions(roleTitle, roleDescription ?? "");
  return NextResponse.json({ questions });
}
