import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazily initialized so importing this module never crashes a build before
// Supabase is provisioned (env vars absent). All app code talks to Supabase
// through the service role key, server-side only — this bypasses RLS, which
// is fine here because access control is enforced entirely by the shared
// password gate in front of the app, not by Supabase Auth.
let _client: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable.");
  }

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}
