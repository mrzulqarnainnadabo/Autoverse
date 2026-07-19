import { Pool } from 'pg';

// Supabase's Postgres (both direct and pooled connections) requires
// SSL on every connection, including local development — there's no
// "local Postgres" in this setup anymore, every environment talks to
// the same Supabase project (or a separate dev project, if you create
// one), so SSL is unconditional rather than gated on NODE_ENV.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  ssl: { rejectUnauthorized: false },
});
