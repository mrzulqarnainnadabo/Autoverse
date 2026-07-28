/**
 * AUTOVERSE — API Server (traditional long-running host: Railway, Render, local dev)
 * For Vercel serverless deployment, see api/index.ts instead — both
 * share the same app definition in app.ts.
 */

import { app } from './app';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`AUTOVERSE API listening on port ${PORT}`);
});
