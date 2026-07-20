# AUTOVERSE — Deployment Guide (Free Tier)

Everything below runs on free tiers suitable for an MVP / pilot. Costs
enter the picture at scale (see "When to upgrade" at the bottom of
each section) — this guide is deliberately about getting to a live,
demoable, secure product at $0/month first.

---

## 1. Supabase (Database + Auth + Storage + Realtime)

1. Create a free project at [supabase.com](https://supabase.com) (500MB database, 1GB storage, 2GB bandwidth, 50K monthly active users on the free tier at time of writing — verify current limits on Supabase's pricing page, they do change).
2. **Database**: Project Settings → Database → Connection string. Copy both the **direct connection** (port 5432, for running migrations) and the **connection pooling** URI (port 6543, for your deployed backend — serverless/edge-friendly).
3. **Run the schema**, in order, via SQL Editor (or `psql $DIRECT_URL -f <file>` locally):
   ```
   backend/db/core_schema.sql
   backend/db/schema.sql
   backend/db/listing_schema.sql
   backend/db/buyer_schema.sql
   backend/db/messaging_schema.sql
   backend/db/supabase_migration.sql
   ```
4. **Storage buckets**: Dashboard → Storage →
   - New bucket `vehicle-photos` → set **Public** (listing photos).
   - New bucket `dealer-verification-docs` → leave **Private** (CAC certificates and government IDs — the backend generates short-lived signed URLs for admin review; nothing here is ever public).
5. **API keys**: Project Settings → API. You'll need:
   - `Project URL` → `SUPABASE_URL` (backend) and `EXPO_PUBLIC_SUPABASE_URL` (mobile)
   - `anon public` key → `EXPO_PUBLIC_SUPABASE_ANON_KEY` (mobile only — safe to ship)
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (backend only — **never** put this in the mobile app)
6. **Realtime**: `supabase_migration.sql` already ran `ALTER PUBLICATION supabase_realtime ADD TABLE messages;` — nothing further to do in the dashboard, but you can confirm under Database → Replication that `messages` is listed.

**When to upgrade**: once you exceed 500MB of listing photos + data, or need daily backups / point-in-time recovery for a production launch (Supabase Pro, ~$25/mo).

---

## 2. Backend (Railway)

1. Push this repo to GitHub (see the main README for the git steps, or let Claude do it via the connected GitHub integration).
2. At [railway.app](https://railway.app), New Project → Deploy from GitHub repo → select `autoverse-app`.
3. Set the **root directory** to `backend/` in Railway's service settings (monorepo — Railway needs to know where the Node app lives).
4. Add environment variables (Railway → Variables tab), copying from `backend/.env.example`:
   ```
   SUPABASE_URL
   SUPABASE_SERVICE_ROLE_KEY
   DATABASE_URL        (use the connection-pooling URI, port 6543)
   ANTHROPIC_API_KEY
   NODE_ENV=production
   ```
5. Set the build/start commands if Railway doesn't auto-detect them:
   - Build: `npm install && npm run build`
   - Start: `npm start`
6. Railway assigns a public URL (`https://your-service.up.railway.app`) — this is your `EXPO_PUBLIC_API_BASE_URL` for the mobile app.

**Free tier limit**: Railway's free tier includes a monthly usage credit (check current terms — this changes) rather than being unlimited; fine for an MVP with light traffic, but watch usage as you approach a real launch.

**Alternative**: [Render](https://render.com) free web services are another free-for.dev option if Railway's credit runs out — same steps, different dashboard.

---

## 3. Mobile (Expo)

For development/demo distribution (no app store review needed):

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app (iOS/Android) — this is free and works over your local network or via Expo's tunnel for remote testers.

**For a shareable build without app store submission**: use [EAS Build](https://expo.dev/eas) (Expo's free tier includes a limited number of builds/month) to produce an installable `.apk` (Android) or ad-hoc `.ipa` (iOS) you can send directly to testers/dealers for the pilot, without going through Google Play / App Store review yet.

```bash
npm install -g eas-cli
eas build --platform android --profile preview
```

**When to upgrade**: when you're ready for App Store / Play Store submission and want unlimited EAS builds (Expo's paid tier), or need OTA update volume beyond the free tier.

---

## 4. Environment variable summary

| Variable | Where | Source |
|---|---|---|
| `SUPABASE_URL` | backend | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | backend only | Supabase → Project Settings → API |
| `DATABASE_URL` | backend | Supabase → Project Settings → Database (pooler URI) |
| `ANTHROPIC_API_KEY` | backend | console.anthropic.com |
| `EXPO_PUBLIC_SUPABASE_URL` | mobile | same as `SUPABASE_URL` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | mobile | Supabase → Project Settings → API (anon key) |
| `EXPO_PUBLIC_API_BASE_URL` | mobile | your Railway/Render backend URL |

## 5. Post-deploy checklist

- [ ] Confirm `/health` returns `200` on your deployed backend URL
- [ ] Sign up a test user via the mobile app, confirm a row appears in `public.users` (verifies the auth sync trigger)
- [ ] Create a test listing end-to-end (Sell flow → AutoInspect → Publish), confirm photos land in the `vehicle-photos` Supabase Storage bucket
- [ ] Send a test message between two accounts, confirm it arrives via Realtime without a manual refresh
- [ ] Double-check `SUPABASE_SERVICE_ROLE_KEY` is **not** present anywhere in the mobile `.env` or committed to git
