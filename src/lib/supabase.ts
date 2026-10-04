import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The Supabase connection (PRD §32).
 *
 * Both values are read from the environment rather than written into the
 * source, so the same code runs against any project. Expo replaces
 * `process.env.EXPO_PUBLIC_*` when it builds the app — which is why the names
 * are spelled out in full here. A dynamic lookup such as `process.env[name]`
 * is not replaced, and would silently be `undefined` on the phone.
 *
 * They are read when a client is asked for, not when this file loads, so a
 * test (or a static web build with no environment at all) can import the
 * module without any connection being made.
 */
function readConfig(): { url: string; key: string } | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

/**
 * How long a single request may take before it counts as unreachable. Without
 * this an offline phone would leave the app waiting on a socket indefinitely
 * instead of falling back to the cached copy.
 */
const REQUEST_TIMEOUT_MS = 15_000;

/** Whether this build has a Supabase project to talk to. */
export function isSupabaseConfigured(): boolean {
  return readConfig() !== null;
}

let client: SupabaseClient | null = null;

/**
 * The shared Supabase client. Created on first use and reused afterwards —
 * the client pools nothing but does hold a fetch configuration, and creating
 * one per call would be wasteful.
 *
 * Throws when the environment is not set up, because every caller is a data
 * operation that would otherwise fail in a far more confusing way.
 */
export function getSupabase(): SupabaseClient {
  const config = readConfig();
  if (!config) {
    throw new Error(
      'Supabase is not configured. Copy `.env.example` to `.env` and fill in ' +
        'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }

  client ??= createClient(config.url, config.key, {
    auth: {
      // DlaiLog has no sign-in: there is no session to keep, refresh or
      // recover from a redirect. Leaving these on would make the client reach
      // for device storage on every launch for nothing.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    db: { timeout: REQUEST_TIMEOUT_MS },
  });

  return client;
}
