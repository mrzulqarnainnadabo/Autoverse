/**
 * AUTOVERSE — Supabase Admin Client (backend only)
 *
 * IMPORTANT: this file must NEVER throw at module load time. A throw
 * here previously took down the entire serverless function on every
 * single request (including /health) whenever env vars were missing —
 * one misconfigured variable meant total outage instead of a
 * diagnosable error. Initialization is lazy and failures are reported
 * as data, not exceptions, so the rest of the app can degrade
 * gracefully and /health can always respond.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseConfigError: string | null =
  !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY
    ? 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable.'
    : null;

let client: SupabaseClient | null = null;
if (!supabaseConfigError) {
  client = createClient(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Throws only when actually called (i.e. when a request needs
 * Supabase), not at import time — so unrelated routes and the health
 * check are unaffected by missing Supabase config.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!client) {
    throw new Error(supabaseConfigError ?? 'Supabase client not initialized.');
  }
  return client;
}

/** Back-compat named export — existing call sites use `supabaseAdmin.auth...` etc.
 *  This proxy defers the "is it configured" check to first property access
 *  instead of import time, matching getSupabaseAdmin()'s lazy behavior. */
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const real = getSupabaseAdmin();
    const value = (real as any)[prop];
    return typeof value === 'function' ? value.bind(real) : value;
  },
});
