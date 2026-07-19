# AUTOVERSE — AI AutoInspect (MVP Vertical Slice)

This is the flagship trust feature: a guided photo-capture flow that feeds
Claude vision analysis to produce a structured vehicle condition report.

## Structure

```
backend/
  types/autoinspect.types.ts       Shared contracts
  prompts/autoInspectPrompt.ts     The Claude system prompt (Nigeria-calibrated)
  services/claudeVisionService.ts  Anthropic API call + JSON validation
  routes/autoinspect.routes.ts     POST submit / GET report / GET history
  middleware/requireAuth.ts        JWT guard stub
  db/schema.sql                    autoinspect_reports table
  db/pool.ts                       PG connection pool

mobile/
  screens/AutoInspectCaptureScreen.tsx   Guided 11-angle capture flow
  screens/AutoInspectReportScreen.tsx    Report rendering
  services/autoInspectApi.ts             Multipart upload client
  constants/theme.ts                     Dark-luxury design tokens
  types/autoinspect.types.ts             Mirror of backend types
```

## Backend setup

```bash
npm install express multer zod pg jsonwebtoken @anthropic-ai/sdk
npm install -D typescript @types/express @types/multer @types/jsonwebtoken @types/node

# Environment variables required:
# ANTHROPIC_API_KEY=sk-ant-...
# DATABASE_URL=postgres://...
# JWT_ACCESS_SECRET=...

psql $DATABASE_URL -f backend/db/schema.sql
```

Mount the router in your Express app:
```ts
import autoinspectRoutes from './routes/autoinspect.routes';
app.use(autoinspectRoutes);
```

## Mobile setup (Expo)

```bash
npx expo install expo-image-picker expo-image-manipulator
```

Usage:
```tsx
<AutoInspectCaptureScreen
  vehicleId={vehicle.id}
  sellerId={currentUser.id}
  declaredYear={vehicle.year}
  declaredMake={vehicle.make}
  declaredModel={vehicle.model}
  declaredMileageKm={vehicle.mileageKm}
  onComplete={(report) => navigation.navigate('AutoInspectReport', { report })}
/>
```

## Design decisions worth knowing

1. **Model tiering**: standard inspections use `claude-sonnet-5`; a
   `escalateToHighAccuracy` flag in `claudeVisionService.analyzeVehicle`
   routes disputed or high-value listings to `claude-opus-4-8`. Wire this
   to a "premium inspection" or "disputed listing" trigger in the product
   layer.
2. **OBSERVED vs INFERRED language**: the prompt forces the model to
   separate what it directly sees from what it infers — this matters
   legally if a report is ever cited in a buyer/seller dispute.
3. **Client-side compression**: photos are resized to 1280px wide and
   compressed to q=0.6 before upload, keeping a full 9-photo submission
   under ~3MB — important for 3G/4G data costs in Nigeria.
4. **Defensive JSON parsing**: `claudeVisionService.parseModelJson`
   validates required fields and score ranges before persisting —
   never trust raw model output for something buyers will act on
   financially without a validation layer.
5. **NDPR**: photos and reports are tied to `sellerId`/`vehicleId` with
   auth-gated access; add a data-retention policy (e.g. purge raw
   photos after N months, retain only the structured report) before
   production launch to stay NDPR-compliant.

## Not yet built (next slices)
- Escrow-ready transaction flow
- Dealer verification / KYC pipeline
- USSD fallback for feature-phone listing browsing
- Push notification on report completion (recommend async job queue —
  Claude vision calls can take 15–30s and shouldn't block the HTTP
  request in production; current implementation is synchronous for MVP
  simplicity)

---

# Dealer Dashboard

Adds dealer-facing inventory management and performance analytics on
top of the AutoInspect foundation.

## Structure (additions)

```
backend/
  db/core_schema.sql                    users, dealers, vehicles, listing_views,
                                         inquiries + two aggregation VIEWs
  types/dealer.types.ts                 Dashboard contracts
  services/dealerDashboardService.ts    Reads from the SQL views
  routes/dealer.routes.ts               GET dashboard / listings / inquiries
  middleware/requireRole.ts             Role guard + "own dealer data only" guard

mobile/
  screens/DealerDashboardScreen.tsx     Responsive dashboard (stat grid, listings, inquiries)
  components/StatCard.tsx
  components/ListingCard.tsx
  components/InquiryRow.tsx
  services/dealerApi.ts
  types/dealer.types.ts
```

## Database setup

Run after `autoinspect/db/schema.sql` since `vehicle_listing_stats`
joins against `autoinspect_reports`:

```bash
psql $DATABASE_URL -f backend/db/core_schema.sql
```

Two views do the heavy lifting:
- **`vehicle_listing_stats`** — per-vehicle: latest AutoInspect
  score/grade + 30-day views/inquiries. Powers each listing card.
- **`dealer_dashboard_summary`** — per-dealer rollup: active listings,
  sold this month, 30-day views/inquiries, new-inquiry count, average
  AutoInspect score across inventory. Powers the top stat grid.

At current expected volume (hundreds of dealers, thousands of
listings) these plain views are fine. If dashboard load times degrade
as the marketplace scales, convert `dealer_dashboard_summary` to a
`MATERIALIZED VIEW` refreshed every 5 minutes via a cron job — the
query shape stays identical, only the refresh strategy changes.

## Backend usage

```ts
import dealerRoutes from './routes/dealer.routes';
app.use(dealerRoutes);
```

`requireOwnDealerIdOrAdmin` ensures a dealer can only query their own
`dealerId` — this endpoint exposes revenue-adjacent metrics (views,
inquiries, sales), so it's guarded beyond plain authentication.

## Mobile usage

```tsx
<DealerDashboardScreen
  dealerId={currentUser.dealerId}
  onOpenListing={(vehicleId) => navigation.navigate('ListingDetail', { vehicleId })}
  onOpenInquiry={(inquiry) => navigation.navigate('InquiryThread', { inquiryId: inquiry.id })}
  onAddListing={() => navigation.navigate('CreateListing')}
/>
```

## Design decisions worth knowing

1. **Aggregation lives in SQL, not application code.** `LEFT JOIN
   LATERAL` subqueries in the views keep per-vehicle and per-dealer
   stats correct and reusable (admin tooling, exports, and this
   dashboard all read the same source of truth).
2. **Responsive grid via `useWindowDimensions`**, not fixed
   breakpoints from a CSS framework — stat cards render 2-up on phones
   and 4-up on tablets/foldables; listings go 1-up / 2-up. Card widths
   are computed, not hardcoded percentages, so gutters stay pixel-exact
   at any screen width.
3. **Verification badge is prominent by design** — trust is
   AUTOVERSE's core differentiator, so a dealer's verified/pending/
   rejected status sits directly under their business name, not buried
   in a settings page.
4. **New inquiries get a warning-gold accent** on the stat card to
   create urgency without alarming the dealer (reserved `critical` red
   for actual fraud/dispute flags elsewhere in the platform).

## Not yet built (next slices)
- Listing detail / edit screen
- Inquiry thread + in-app messaging
- Dealer verification (KYC) submission flow
- Subscription tier upgrade flow (free → plus → pro)

---

# Sell / New Listing Creation

A 4-step wizard (Photos → AI AutoInspect → Details → Publish) built as
a **draft-then-publish** flow: a near-empty vehicle row is created the
instant a seller taps "Add Listing," so progress is never lost if they
close the app mid-flow — it's resumable as a draft.

## Structure (additions)

```
backend/
  db/listing_schema.sql              Nullable vehicle columns for drafts + vehicle_photos table
  types/listing.types.ts             Draft/publish contracts
  services/listingService.ts         Draft → photos+inspect → details → publish lifecycle
  services/photoStorageService.ts    Pluggable photo storage (local disk MVP → swap for S3)
  services/autoinspectPersistence.ts Shared report-save helper (used by both AutoInspect and Sell flow)
  routes/listing.routes.ts           POST draft / POST photos-and-inspect / PATCH details / POST publish
  utils/httpError.ts                 Shared status-coded error → thin route handlers

mobile/
  screens/SellScreen.tsx                    Wizard orchestrator
  screens/sell/PhotosStep.tsx                Step 1
  screens/sell/InspectStep.tsx               Step 2
  screens/sell/DetailsStep.tsx                Step 3
  screens/sell/PublishStep.tsx                 Step 4 (review + publish)
  screens/DealerHomeExample.tsx                 Reference: wiring Sell → Dashboard
  components/PhotoUploadGrid.tsx                Reusable guided photo grid
  components/StepProgressBar.tsx                Reusable step indicator
  constants/nigeria.ts                          36 states + FCT
  services/listingApi.ts                        API client for the flow
  types/listing.types.ts
```

## Database setup

Run after `core_schema.sql` and the AutoInspect `schema.sql`:

```bash
psql $DATABASE_URL -f backend/db/listing_schema.sql
```

This relaxes `vehicles.make/model/year/mileage_km/price_ngn` to
nullable (drafts start empty) and adds `vehicle_photos` for the
listing gallery. Completeness is enforced in **application code**
(`listingService.validateForPublish`) at publish time, not by DB
constraints — this keeps draft-saving flexible without weakening data
integrity for anything actually live on the marketplace.

## Backend usage

```ts
import listingRoutes from './routes/listing.routes';
app.use(listingRoutes);
```

Set `UPLOAD_ROOT` and `PUBLIC_BASE_URL` env vars for photo storage
(local disk by default — see `photoStorageService.ts` for the swap to
S3/Cloudinary before production).

## Mobile usage

```tsx
<SellScreen
  onCancel={() => navigation.goBack()}
  onPublished={(listing) => {
    dashboardRef.current?.prependListing(toDealerListingItem(listing));
    navigation.navigate('DealerDashboard');
  }}
/>
```

## Design decisions worth knowing

1. **One photo shoot, two purposes.** The same guided-angle photos
   sellers capture in Step 1 become both the public listing gallery
   *and* the AutoInspect input set — critical for Nigerian mobile data
   costs; sellers never shoot the same car twice.
2. **Draft-then-publish, not a giant client-side form.** Each step
   persists to the server as it completes (`createDraft` →
   `attachPhotosAndInspect` → `updateDetails` → `publish`). If the
   seller's connection drops or they background the app, nothing is
   lost — a resumable draft already exists server-side.
3. **Ownership checked on every mutation.** `listingService`'s private
   `assertOwnership` runs before any read or write to a draft, so a
   seller can never edit or view another seller's in-progress listing
   by guessing a `vehicleId`.
4. **Publish validation lives in one place** (`validateForPublish`) and
   is exposed both as a route (`GET .../publish-check`, for a "what's
   missing" UI affordance) and as the gate inside `publish()` itself —
   so the check can never be bypassed by skipping straight to the
   publish call.
5. **Dashboard sync uses `forwardRef` + `useImperativeHandle`**, not a
   global store — deliberately minimal for the MVP. It gives instant
   optimistic UI (`prependListing`) plus a full reconciling refetch
   (to pick up the AutoInspect score/grade computed server-side),
   without pulling in Redux/Zustand this early. Swap for a proper
   query cache (React Query/SWR) once the app has more screens sharing
   this data.
6. **AutoInspect failure doesn't block listing creation.** If the
   Claude vision call fails (network, rate limit), `InspectStep` offers
   Retry or Skip — a seller can still publish without a trust score
   and run AutoInspect later, matching how the standalone AutoInspect
   flow is exposed as an independent capability elsewhere in the app.

## Not yet built (next slices)
- Resume-draft entry point (list a seller's in-progress drafts)
- Photo reordering / drag-to-set-cover in `PhotoUploadGrid`
- Duplicate-listing detection (same VIN/plate across sellers)
- Server-side image moderation before photos go live

---

# Buyer Search & Car Detail

The discovery-to-conversion surface: search/filter/sort over live
inventory, and a detail page built to move a confident buyer straight
to "Message Dealer" or "Call."

## Structure (additions)

```
backend/
  db/buyer_schema.sql                 pg_trgm search indexes, dealer rating columns,
                                       public_listings view (single source for search + detail)
  types/search.types.ts               Search & public detail contracts
  services/searchService.ts           Parameterized dynamic filter/sort query builder
  services/publicListingService.ts    Detail page assembly + buyer inquiry creation
  routes/search.routes.ts             GET search (public) / GET detail (public) / POST inquiry (auth)

mobile/
  screens/SearchScreen.tsx                 Search bar, filter chips, sort, live count, results grid
  screens/CarDetailScreen.tsx               Carousel → trust → price → specs → financing → dealer
  components/BuyerListingCard.tsx           Buyer-facing sibling of the dealer ListingCard
  components/PhotoCarousel.tsx              Paged carousel with dot indicator + counter
  components/InspectionSummaryCard.tsx      Condensed AutoInspect summary for the detail page
  components/FinancingCalculator.tsx        22% p.a. reducing-balance loan estimate
  components/DealerInfoCard.tsx             Rating, verified badge, message/call actions
  components/MessageComposeModal.tsx        First-contact message → seeds the inquiries pipeline
  components/Chip.tsx                       Generic reusable filter chip (used across Search + Financing)
  services/buyerApi.ts                      search / detail / inquiry client
  types/search.types.ts
```

## Database setup

Run after `core_schema.sql`, AutoInspect `schema.sql`, and `listing_schema.sql`:

```bash
psql $DATABASE_URL -f backend/db/buyer_schema.sql
```

`public_listings` is the single view both `SearchScreen` and
`CarDetailScreen` read from — search results and the detail page can
never disagree about which AutoInspect report is "current" or whether
a dealer is verified, because both paths join the same way. Trigram
indexes (`pg_trgm`) make partial/misspelled make-model search
(`ILIKE '%camri%'`) fast without a full table scan — common on
Nigerian mobile keyboards.

## Backend usage

```ts
import searchRoutes from './routes/search.routes';
app.use(searchRoutes);
```

Search and detail are intentionally public (no `requireAuth`) — this
is the top-of-funnel browse surface. Only `POST .../inquiries`
requires auth, since a message needs an identifiable sender.

## Mobile usage

```tsx
<SearchScreen onOpenListing={(vehicleId) => navigation.navigate('CarDetail', { vehicleId })} />

<CarDetailScreen
  vehicleId={route.params.vehicleId}
  onViewFullReport={(reportId) => navigation.navigate('AutoInspectReport', { reportId })}
/>
```

## Design decisions worth knowing

1. **Search re-queries the server on every filter change** (debounced
   400ms), rather than filtering a client-side cache — inventory
   changes in real time (a dealer marks something sold), and the
   indexed view makes this cheap even under load.
2. **Messaging is deliberately a "first contact" modal, not a full
   chat UI.** It writes directly into the existing `inquiries` table,
   so a buyer's message shows up on the Dealer Dashboard immediately
   with zero new sync logic. Full threaded/real-time messaging is the
   natural next vertical — see proposal below.
3. **Financing calculator is an estimate tool, not a loan
   application.** No PII beyond what's already collected is gathered;
   the disclaimer is explicit that rates vary by lender. This keeps it
   in "helpful affordability context" territory rather than implying
   AUTOVERSE is originating credit.
4. **`BuyerListingCard` is a deliberate sibling of the dealer
   `ListingCard`**, not the same component reused with optional props
   — the two audiences need different information (views/inquiries
   for a dealer managing inventory vs. location/verified-badge for a
   buyer deciding whether to click). Keeping them separate avoids a
   component with a dozen conditional branches for two very different
   jobs.
5. **`InspectionSummaryCard` is a condensed sibling of
   `AutoInspectReportScreen`**, same reasoning — the detail page needs
   a glance-and-convert summary, not the full report. It links out to
   the full report rather than duplicating it inline.

## Not yet built (next slices)
- Saved searches / price-drop alerts
- Listing comparison (side-by-side spec view)
- Map view for location-based search
- Recently viewed / similar listings on the detail page

---

# Messaging System

Threaded, listing-anchored conversations between buyers and dealers/
sellers — built on a schema shaped for a clean Supabase Realtime
migration, with the existing inquiry flow wired in as the seed of
every thread.

## Structure (additions)

```
backend/
  db/messaging_schema.sql          conversations + messages tables (append-only,
                                    Realtime-ready) + commented RLS policy stubs
  types/messaging.types.ts         Conversation/message contracts
  services/messagingService.ts     Thread lifecycle, send/read, participant enforcement
  routes/messaging.routes.ts       Inbox / thread / messages / read, all auth-required

mobile/
  screens/MessagesScreen.tsx           Inbox — every thread, unread counts, listing thumbnails
  screens/ChatScreen.tsx                Thread view with pinned listing context header
  components/ConversationListItem.tsx   Inbox row
  components/MessageBubble.tsx           Sent/received styling + read receipts (✓ / ✓✓)
  components/MessageComposeModal.tsx     (updated) now returns a conversationId
  services/messagingApi.ts               inbox / thread / messages / send / read client
  types/messaging.types.ts
  utils/formatTime.ts                    timeAgo / clockTime / dayLabel — WAT-local, no date library
```

## Database setup

Run after `core_schema.sql`, `listing_schema.sql`, and `buyer_schema.sql`:

```bash
psql $DATABASE_URL -f backend/db/messaging_schema.sql
```

`conversations` has a `UNIQUE (vehicle_id, buyer_id)` constraint — one
thread per buyer per listing, ever. Repeated contact reuses it rather
than fragmenting into duplicate threads. `messages` is append-only
with UUID PKs and `created_at` ordering, which is exactly the shape
Supabase Realtime streams cleanly — see the migration notes at the
bottom of the schema file, including commented RLS policies to enable
once auth moves to Supabase Auth (`auth.uid()`).

## How the existing inquiry flow connects

`publicListingService.createInquiry` (built in the buyer-side slice)
now does two things on every "Message Dealer" submission:
1. Writes to `inquiries` as before — unchanged, still powers the
   Dealer Dashboard's Recent Inquiries feed.
2. Calls `messagingService.getOrCreateConversation` +
   `sendMessage`, seeding a real, continuable thread with that same
   message as message #1.

Nothing about the Sell flow, Dealer Dashboard, or Search/Detail
screens needed to change — this is additive.

## Backend usage

```ts
import messagingRoutes from './routes/messaging.routes';
app.use(messagingRoutes);
```

Every route requires auth; `messagingService.assertParticipant` is the
single enforcement point checked before any read or write to a thread
— a user who isn't the buyer, dealer, or seller on a conversation gets
a 403 regardless of which endpoint they hit.

## Mobile usage

```tsx
<MessagesScreen onOpenConversation={(id) => navigation.navigate('Chat', { conversationId: id })} />

<ChatScreen
  conversationId={route.params.conversationId}
  currentUserId={currentUser.id}
  onBack={() => navigation.goBack()}
  onOpenListing={(vehicleId) => navigation.navigate('CarDetail', { vehicleId })}
/>

// From CarDetailScreen, after a buyer's first message:
<CarDetailScreen
  vehicleId={vehicleId}
  onOpenConversation={(conversationId) => navigation.navigate('Chat', { conversationId })}
/>
```

## Design decisions worth knowing

1. **Polling now, Realtime-shaped from day one.** `ChatScreen` polls
   every 4 seconds — clearly marked as a placeholder in a `REALTIME
   NOTE` comment. Because `messages` is append-only with `created_at`
   ordering, swapping the polling `useEffect` for a
   `supabase.channel().on('postgres_changes', ...)` subscription is a
   client-only change; no schema or service-layer rework needed.
2. **One enforcement point, not scattered checks.** Every service
   method funnels through `assertParticipant` before touching a
   conversation. When Supabase RLS goes live, these become a
   defense-in-depth backstop rather than the only guard — intentional
   double coverage during the migration window, not redundancy to prune.
3. **Read receipts are a boolean, not a timestamp UI.** `read_at`
   presence drives a simple ✓ → ✓✓ (gold) transition on the sender's
   own bubbles — enough signal for a Nigerian buyer/dealer relationship
   built on trust, without building read-receipt privacy controls this
   early.
4. **The listing context header is pinned and tappable**, not just
   informational — tapping it returns to `CarDetailScreen`. With
   multiple concurrent threads, buyers and dealers need a one-tap way
   to re-orient on "which car is this conversation about."
5. **Unread counts are computed on read, not maintained as a counter
   column.** `COUNT(*) WHERE sender_id != viewer AND read_at IS NULL`
   is simple and correct; if inbox load times become a concern at
   scale, denormalize to a per-participant counter updated
   transactionally on send/read — the query shape signals exactly
   where that optimization would go.

## Not yet built (next slices)
- Actual Supabase Realtime subscription (swap-in, per the note above)
- Typing indicators
- Push notifications on new message
- Message attachments (photos within a conversation)
- Blocking / reporting a user
