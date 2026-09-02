/**
 * AUTOVERSE — Vercel Serverless Entrypoint
 *
 * All routes live on the Express app (app.ts). Vercel routes every
 * path to this file via vercel.json.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../app';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as any, res as any);
}
