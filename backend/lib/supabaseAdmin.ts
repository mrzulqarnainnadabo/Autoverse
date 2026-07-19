/**
 * AUTOVERSE — Supabase Admin Client (backend only)
 *
 * Uses the SERVICE ROLE key, which bypasses Row Level Security. This
 * is correct here because the Express layer IS the trust boundary for
 * writes (zod validation, ownership checks in listingService /
 * messagingService, etc.) — RLS on the DB is the second layer of
 * defense for anything the mobile client queries directly (see
 * mobile/lib/supabaseClient.ts, which uses the ANON key + RLS).
 *
 * NEVER expose SUPABASE_SERVICE_ROLE_KEY to the mobile app or any
 * client-side bundle — it must only ever live in backend environment
 * variables (Railway/Render/Fly secrets, not committed to git).
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env and fill in your Supabase project credentials (Project Settings → API).'
  );
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
