/**
 * AUTOVERSE — Auth Token Storage
 *
 * Every mobile API client (autoInspectApi, dealerApi, listingApi,
 * buyerApi, messagingApi) imports `getAccessToken` from this file to
 * build its Authorization header. Centralizing it here means swapping
 * the auth provider — which is exactly what just happened, custom JWT
 * → Supabase Auth — only touches one file, not every service module.
 */

import { supabase } from '../lib/supabaseClient';

export async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new Error('Not signed in. Please log in and try again.');
  }
  return data.session.access_token;
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
