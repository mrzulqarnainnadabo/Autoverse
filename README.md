# AUTOVERSE

**Nigeria's premier AI-assisted automotive marketplace and dealer infrastructure platform.**

Trust-first, mobile-first, built to solve fraud, fragmentation, opaque pricing, and dealer inefficiencies in the Nigerian used-car market. Flagship feature: **AI AutoInspect** — Claude-powered, photo-based vehicle condition reports.

> Driving Trust. Delivering Value.

---

## What's built

| Vertical | Status |
|---|---|
| AI AutoInspect (Claude vision condition reports) | ✅ |
| Dealer Dashboard (inventory, inquiries, performance) | ✅ |
| Sell / New Listing Creation (draft → publish wizard) | ✅ |
| Buyer Search & Car Detail (filters, financing calculator) | ✅ |
| Messaging System (Realtime chat, listing-anchored threads) | ✅ |
| Escrow / secure payments | 🔜 |
| Dealer Verification (KYC) | 🔜 |
| Admin tooling | 🔜 |

Detailed design decisions and the incremental build history for each vertical are in [`docs/BUILD_LOG.md`](docs/BUILD_LOG.md).

## Tech stack

- **Mobile**: React Native (Expo), dark-luxury UI (`#D4AF37` gold on near-black), TypeScript
- **Backend**: Node.js + Express, TypeScript, Zod validation
- **Database**: Supabase Postgres (with Row Level Security on Realtime-exposed tables)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage (vehicle photos)
- **Realtime**: Supabase Realtime (chat)
- **AI**: Anthropic Claude (vision) for AI AutoInspect condition reports

## Folder structure

```
autoverse-app/
├── backend/                 Express API
│   ├── db/                  SQL schema files, run in order (see below)
│   ├── lib/                 Supabase admin client
│   ├── middleware/          Auth guard, role/ownership guards
│   ├── routes/              One file per vertical (autoinspect, dealer, listing, search, messaging)
│   ├── services/            Business logic — this is where the real work happens
│   ├── types/                Shared TypeScript contracts
│   ├── utils/                 HttpError + shared helpers
│   ├── server.ts               Entrypoint — mounts every route module
│   └── .env.example
├── mobile/                    Expo app
│   ├── components/            Reusable UI (PhotoUploadGrid, ListingCard, MessageBubble, etc.)
│   ├── constants/               Design tokens (theme.ts), Nigerian states
│   ├── lib/                       Supabase client (Auth + Realtime)
│   ├── screens/                    One or more files per vertical
│   │   └── sell/                     Sell flow's 4 wizard steps
│   ├── services/                     API clients — one per vertical
│   ├── types/                         Shared TypeScript contracts
│   ├── utils/                          Time formatting, etc.
│   └── .env.example
├── docs/
│   └── BUILD_LOG.md                   Per-vertical design decisions & what's not yet built
├── DEPLOYMENT.md                       Supabase + Railway + Expo deployment guide
└── .gitignore
```

## Database setup

Schema files must be applied **in this order** (each depends on tables from the ones before it):

```bash
psql $DATABASE_URL -f backend/db/core_schema.sql
psql $DATABASE_URL -f backend/db/schema.sql              # autoinspect_reports
psql $DATABASE_URL -f backend/db/listing_schema.sql
psql $DATABASE_URL -f backend/db/buyer_schema.sql
psql $DATABASE_URL -f backend/db/messaging_schema.sql
psql $DATABASE_URL -f backend/db/supabase_migration.sql  # auth sync trigger, RLS, realtime
```

Or run them all via the Supabase Dashboard's SQL Editor, in the same order. See [`DEPLOYMENT.md`](DEPLOYMENT.md) for the full Supabase project setup (including creating the `vehicle-photos` storage bucket, which isn't SQL).

## Quick start

### 1. Supabase project
Create a free project at [supabase.com](https://supabase.com), then run the schema files above against it. Full walkthrough in [`DEPLOYMENT.md`](DEPLOYMENT.md).

### 2. Backend
```bash
cd backend
cp .env.example .env   # fill in your Supabase + Anthropic credentials
npm install
npm run dev             # http://localhost:4000
```

### 3. Mobile
```bash
cd mobile
cp .env.example .env    # fill in your Supabase URL/anon key + backend URL
npm install
npm start                # opens Expo Dev Tools — scan the QR with Expo Go
```

## Deployment

Free-tier deployment guide (Supabase + Railway + Expo) is in [`DEPLOYMENT.md`](DEPLOYMENT.md).

## Security notes

- The **service role key** (`SUPABASE_SERVICE_ROLE_KEY`) must only ever exist in backend environment variables — never in the mobile app or any client bundle. The mobile app uses the **anon key**, which is safe to ship because it's constrained by Row Level Security.
- Row Level Security is currently enabled on `conversations` and `messages` (the tables the mobile client queries directly via Realtime). Every other table is accessed exclusively through the Express API, which enforces its own ownership checks — see `docs/BUILD_LOG.md` for the reasoning per vertical.
- Photo uploads, listing edits, and messages all pass through Zod validation and ownership checks server-side, regardless of what a client sends.

## License

Proprietary — © ISEYC / Hubil Group. Not licensed for reuse without permission.
