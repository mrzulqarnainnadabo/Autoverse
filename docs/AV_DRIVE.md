# AV Drive — Product Decision & MVP Spec

> **Decision date:** 2026-09-01  
> **Status:** Locked for design & build — not open street taxi  
> **Parent product:** AUTOVERSE (marketplace + dealer infrastructure)

---

## 1. What AV Drive is

**AV Drive** is Autoverse’s side-income layer for **verified car owners**.

Owners earn from structured, higher-trust jobs — not random street hailing like Bolt/InDrive.

**One-line:**
> Buy and sell with trust on Autoverse. Earn with the same verified car on AV Drive.

---

## 2. What AV Drive is NOT

| Not this | Why |
|---|---|
| Open taxi / street hail | Regulatory, safety, ops burden; fights Bolt on price |
| Guaranteed employment | We match jobs; we do not promise income |
| Separate brand/app (MVP) | Same users, cars, KYC, ratings — one app |
| City-wide 24/7 fleet ops | Start narrow: 1–2 cities, 2 job types |

---

## 3. MVP scope (build this first)

### Cities (pilot)
- **Abuja** and/or **Lagos** only

### Job types (only two)
1. **Airport / hotel transfer** — fixed corridor, scheduled
2. **Intercity private hire** — e.g. Abuja ↔ Lagos, point-to-point

### Who can offer AV Drive
A user must have:
1. Autoverse account
2. Owner KYC (same spirit as dealer verification)
3. At least one vehicle with photos
4. Optional but preferred: **AI AutoInspect** score above a threshold → **Work-ready** badge

### Core user flows

**Owner**
1. Open **AV Drive** tab / entry
2. Select vehicle → complete work eligibility if needed
3. Toggle **Available** + set hours, city, job types
4. Receive job request → accept / decline
5. Complete job → get rating + payout record

**Client (rider / booker)**
1. Choose job type + city + time
2. See **Work-ready** cars/owners (badge, rating, inspect grade if any)
3. Request booking
4. Chat in existing messaging (or job-thread)
5. Pay (MVP: log amount + mark paid; escrow later)
6. Rate owner

### Explicitly out of MVP
- Live GPS tracking / turn-by-turn
- Instant street matching
- Multi-stop rides
- Insurance product (partner later)
- Escrow (reuse marketplace escrow when built)
- More than 2 job types

---

## 4. Why this is better than Bolt/InDrive for Autoverse

| Dimension | Bolt/InDrive | AV Drive (MVP) |
|---|---|---|
| Trust | Driver rating only | Owner KYC + vehicle + optional AutoInspect |
| Trip value | Many cheap trips | Fewer, clearer, higher-trust jobs |
| Brand fit | Mobility pure-play | Same trust rails as car sales |
| Owner control | App-driven surge | Owner sets availability & job types |
| Data | Trip telemetry | Vehicle + owner reputation across sell + drive |

---

## 5. Data model (Supabase — draft)

Reuse `users`, `vehicles`, verification tables where possible.

```text
av_drive_profiles          -- owner opt-in, cities, job types, availability
av_drive_jobs              -- booking requests: type, status, pay, times, corridor
av_drive_job_events        -- accept / start / complete / cancel (audit)
av_drive_ratings           -- post-job ratings (link to users + job)
```

Statuses for `av_drive_jobs`:
`requested → accepted → in_progress → completed | cancelled | disputed`

---

## 6. Notion ops (human layer)

Do **not** run live bookings in Notion. Use Notion for ops:

| Database | Purpose |
|---|---|
| **AV Drive Partners** | Owners who applied / approved; city; badge level |
| **AV Drive Jobs** | Manual oversight of bookings, disputes, WhatsApp follow-ups |
| **AV Drive Disputes** | No-shows, condition issues, payment fights |

App/Supabase = system of record for transactions.  
Notion = partner onboarding + weekly review + WhatsApp support notes.

---

## 7. Screens to add (mobile)

1. `AvDriveHomeScreen` — entry, explanation, CTA
2. `AvDriveEligibilityScreen` — KYC + vehicle + Work-ready checklist
3. `AvDriveAvailabilityScreen` — toggle + hours + job types
4. `AvDriveJobsScreen` — owner’s incoming / active jobs
5. `AvDriveBookScreen` — client: pick type, time, see partners
6. `AvDriveJobDetailScreen` — both sides: status, chat, complete

Reuse: messaging, ratings patterns, dark-luxury theme, verification UX.

---

## 8. API sketch (backend)

```text
POST   /av-drive/profile              — create/update owner profile
GET    /av-drive/profile/me
POST   /av-drive/availability         — set available + windows
GET    /av-drive/partners             — public list (city + job type filters)
POST   /av-drive/jobs                 — client creates job request
GET    /av-drive/jobs/mine            — owner or client list
POST   /av-drive/jobs/:id/accept
POST   /av-drive/jobs/:id/complete
POST   /av-drive/jobs/:id/cancel
POST   /av-drive/jobs/:id/rate
```

All mutating routes: auth + ownership checks (same pattern as listings/messaging).

---

## 9. Build order (auto-push friendly)

| Order | Slice | Outcome |
|---|---|---|
| 1 | `docs/AV_DRIVE.md` (this file) | Decision locked |
| 2 | `backend/db/av_drive_schema.sql` | Tables exist |
| 3 | Types + service stubs + routes | API contract |
| 4 | Owner eligibility + availability UI | Owners can opt in |
| 5 | Client book + job list UI | End-to-end dry run |
| 6 | Notion partner/job DBs | Ops ready |
| 7 | Pilot with 5–10 owners in one city | Learn before scale |

**Do not** production-deploy AV Drive until marketplace pilot (dealers + listings) is stable.

---

## 10. Success metrics (pilot)

- Owners completing eligibility
- Jobs requested vs accepted
- Completion rate
- Dispute rate
- Repeat bookings per owner
- Qualitative: “Did this feel safer / clearer than street apps?”

---

## 11. Copy (product)

**Owner CTA:** Earn with a verified car — airport & intercity jobs, on your schedule.  
**Client CTA:** Book a Work-ready private car — not a random street pickup.  
**Trust line:** Same Autoverse verification and vehicle standards. Structured jobs only.

---

*Owned by Autoverse / Hubil Group. Proprietary.*
