import { supabaseService } from "./supabase";

/**
 * Marks any in_progress candidate whose expires_at has passed as expired.
 * Safe to call on every admin page load (no-op when nothing is overdue).
 */
export async function expireOverdueCandidates(): Promise<void> {
  const sb = supabaseService();
  await sb
    .from("candidates")
    .update({ status: "expired" })
    .eq("status", "in_progress")
    .not("expires_at", "is", null)
    .lt("expires_at", new Date().toISOString());
}
