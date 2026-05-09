import { NextResponse } from "next/server";
import { expireOverdueCandidates } from "@/lib/expire-candidates";

export const dynamic = "force-dynamic";

// Called by Vercel Cron (vercel.json) every 5 minutes.
// Also callable manually; protected by CRON_SECRET env var.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  await expireOverdueCandidates();
  return NextResponse.json({ ok: true });
}
