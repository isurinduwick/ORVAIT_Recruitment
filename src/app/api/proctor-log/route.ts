import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { token, type, detail } = await req.json();
    if (!token || !type) return NextResponse.json({ ok: false });

    const sb = supabaseService();

    // Resolve candidate id from token
    const { data: candidate } = await sb
      .from("candidates")
      .select("id, status")
      .eq("token", token)
      .maybeSingle();

    // Only log for in-progress assessments
    if (!candidate || candidate.status !== "in_progress") {
      return NextResponse.json({ ok: false });
    }

    await sb.from("suspicious_events").insert({
      candidate_id: candidate.id,
      event_type: type,
      detail: detail ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
