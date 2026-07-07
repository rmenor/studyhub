import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ─── Supabase JS client ─────────────────────────────────────────────
// Two clients:
//   - createBrowserSupabase(): anon (publishable) key. Safe to call from
//     client components. Subject to Row Level Security.
//   - createServerSupabase(): service-role key when set, else falls back
//     to the publishable key (still RLS-bound). Use only on the server.
//
// Required env vars:
//   NEXT_PUBLIC_SUPABASE_URL              — public URL, safe in the browser
//   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  — public anon key, safe in the browser
//   SUPABASE_SERVICE_ROLE_KEY             — admin key, SERVER ONLY (never
//                                          expose this with NEXT_PUBLIC_)

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function hasSupabaseConfig(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

/**
 * Browser-safe client. Uses the publishable key; all access is gated by RLS.
 * Pass it down to client components and use it from event handlers.
 */
export function createBrowserSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

/**
 * Server-only client. Uses the service-role key when present (full access,
 * bypasses RLS); otherwise falls back to the publishable key (RLS only).
 * Call only from Route Handlers / Server Components / Server Actions.
 */
export function createServerSupabase(): SupabaseClient {
  const url = SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = SUPABASE_SERVICE_ROLE_KEY ?? SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase URL or key (set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}