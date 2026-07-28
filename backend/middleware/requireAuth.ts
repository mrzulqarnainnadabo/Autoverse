/**
 * AUTOVERSE — Auth Guard (Supabase Auth)
 *
 * Verifies the bearer token against Supabase Auth via
 * supabaseAdmin.auth.getUser(). Wrapped in try/catch so a Supabase
 * misconfiguration (missing env vars) produces a clear 503 response
 * on the routes that actually need auth, rather than crashing the
 * whole function for every request — see lib/supabaseAdmin.ts.
 */

import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin, supabaseConfigError } from '../lib/supabaseAdmin';
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
  if (supabaseConfigError) {
    return res.status(503).json({ error: 'Auth service misconfigured.', details: supabaseConfigError });
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }

  const token = header.slice('Bearer '.length);

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    const { rows } = await pool.query(`SELECT role FROM users WHERE id = $1`, [data.user.id]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'User profile not found. Please try again shortly.' });
    }
    req.user = { id: data.user.id, role: rows[0].role };
    return next();
  } catch (err) {
    console.error('[requireAuth] failed:', err);
    return res.status(500).json({ error: 'Authentication check failed.' });
  }
}
