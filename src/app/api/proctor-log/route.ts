import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { token, type, detail } = await req.json();
    if (!token || !type) return NextResponse.json({ ok: false, reason: "missing_fields" });

    const sb = supabaseService();

    const { data: candidate, error: candidateError } = await sb
      .from("candidates")
      .select("id, status")
      .eq("token", token)
      .maybeSingle();

    if (candidateError) {
      console.error("[proctor-log] candidate lookup error:", candidateError.message);
      return NextResponse.json({ ok: false, reason: "lookup_error" });
    }

    if (!candidate) {
      return NextResponse.json({ ok: false, reason: "not_found" });
    }

    if (candidate.status !== "in_progress") {
      return NextResponse.json({ ok: false, reason: "not_in_progress", status: candidate.status });
    }

    const { error: insertError } = await sb.from("suspicious_events").insert({
      candidate_id: candidate.id,
      event_type: type,
      detail: detail ?? null,
      occurred_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("[proctor-log] insert error:", insertError.message, insertError.details);
      return NextResponse.json({ ok: false, reason: "insert_error", error: insertError.message });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[proctor-log] unexpected error:", err);
    return NextResponse.json({ ok: false, reason: "exception" });
  }
}
