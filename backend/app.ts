import express, { Request, Response, NextFunction } from 'express';
import autoinspectRoutes from './routes/autoinspect.routes';
import dealerRoutes from './routes/dealer.routes';
import listingRoutes from './routes/listing.routes';
import searchRoutes from './routes/search.routes';
import messagingRoutes from './routes/messaging.routes';
import verificationRoutes from './routes/verification.routes';
import avDriveRoutes from './routes/avDrive.routes';

export const app = express();

app.use(express.json());

// Friendly root endpoint so opening the Vercel domain in a browser does not
// show Express's default "Cannot GET /" response.
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'autoverse-api',
    status: 'online',
    health: '/health',
    api: '/api/v1',
  });
});

// Deliberately dependency-free: never imports supabaseAdmin or pool,
// so this endpoint can ALWAYS respond, even with zero env vars set.
// It reports config status as data instead of crashing on missing vars.
app.get('/health', (_req: Request, res: Response) => {
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL', 'ANTHROPIC_API_KEY'];
  const missing = requiredEnvVars.filter((name) => !process.env[name]);

  res.json({
    status: missing.length === 0 ? 'ok' : 'degraded',
    service: 'autoverse-api',
    config: {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      DATABASE_URL: !!process.env.DATABASE_URL,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    },
    missing: missing.length > 0 ? missing : undefined,
  });
});

app.use(autoinspectRoutes);
app.use(dealerRoutes);
app.use(listingRoutes);
app.use(searchRoutes);
app.use(messagingRoutes);
app.use(verificationRoutes);
app.use(avDriveRoutes);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled error]', err);
  res.status(500).json({ error: 'Internal server error.' });
});
