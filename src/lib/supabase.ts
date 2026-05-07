import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function supabaseAnon() {
  return createClient(url, anon, { auth: { persistSession: false } });
}

export function supabaseService() {
  return createClient(url, service, { auth: { persistSession: false } });
}
