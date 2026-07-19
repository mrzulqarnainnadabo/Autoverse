/**
 * AUTOVERSE — Auth Guard (Supabase Auth)
 *
 * Verifies the bearer token against Supabase Auth (not a locally
 * signed JWT) via supabaseAdmin.auth.getUser(). This validates the
 * token with Supabase directly rather than checking a shared secret
 * locally — slightly higher latency per request, but it means token
 * revocation, expiry, and refresh are all handled by Supabase, and
 * this middleware never has to know about signing keys at all.
 *
 * Role isn't part of the Supabase auth token by default, so we look
 * it up from public.users (kept in sync with auth.users via the
 * on-signup trigger — see db/supabase_migration.sql). This is a fast,
 * indexed lookup, not a heavy join.
 */

import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { pool } from '../db/pool';

export interface AuthenticatedUser {
  id: string;
  role: 'buyer' | 'seller' | 'dealer' | 'importer' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }

  const token = header.slice('Bearer '.length);

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  try {
    const { rows } = await pool.query(`SELECT role FROM users WHERE id = $1`, [data.user.id]);
    if (rows.length === 0) {
      // Auth succeeded but the profile row hasn't synced yet (rare race
      // right after signup) — treat as unauthenticated rather than
      // guessing a role.
      return res.status(401).json({ error: 'User profile not found. Please try again shortly.' });
    }
    req.user = { id: data.user.id, role: rows[0].role };
    return next();
  } catch (err) {
    console.error('[requireAuth] role lookup failed:', err);
    return res.status(500).json({ error: 'Authentication check failed.' });
  }
}
