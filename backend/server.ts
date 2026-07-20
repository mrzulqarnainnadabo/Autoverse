/**
 * AUTOVERSE — API Server
 * Mounts every route module built across the project. Each route file
 * is self-contained (its own router, validation, and service calls),
 * so adding a new vertical is just one more `app.use(...)` line here.
 */

import express from 'express';
import autoinspectRoutes from './routes/autoinspect.routes';
import dealerRoutes from './routes/dealer.routes';
import listingRoutes from './routes/listing.routes';
import searchRoutes from './routes/search.routes';
import messagingRoutes from './routes/messaging.routes';
import verificationRoutes from './routes/verification.routes';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'autoverse-api' }));

app.use(autoinspectRoutes);
app.use(dealerRoutes);
app.use(listingRoutes);
app.use(searchRoutes);
app.use(messagingRoutes);
app.use(verificationRoutes);

// Centralized error fallback for anything that slips past a route's own
// try/catch — keeps the process from crashing on an unexpected throw.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled error]', err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`AUTOVERSE API listening on port ${PORT}`);
});
