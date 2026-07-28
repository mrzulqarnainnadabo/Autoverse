/**
 * AUTOVERSE — Vercel Serverless Entrypoint
 * Vercel's Node.js runtime wraps a default-exported Express app as a
 * request handler automatically — no additional adapter code needed.
 * All routing (including /health and every /api/v1/* route) is
 * handled internally by Express via app.ts; vercel.json rewrites every
 * incoming path to this one function.
 */

import { app } from '../app';

export default app;
