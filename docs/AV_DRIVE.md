# AV Drive — Product Decision & MVP Spec

> **Decision date:** 2026-09-01  
> **Updated:** 2026-09-01 — pilot cities Kaduna + Abuja; GPS/maps phased in  
> **Status:** Spec locked — schema next  
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
| Full Bolt-style live matching day one | We add GPS in phases; jobs stay structured |

---

## 3. MVP scope

### Cities (pilot) — LOCKED
- **Abuja**
- **Kaduna**
- Intercity corridor: **Abuja ↔ Kaduna**

### Job types (MVP)
1. **Airport / hotel transfer** — within Abuja or Kaduna (e.g. AAIA ↔ city; Kaduna airport ↔ city)
2. **Intercity private hire** — **Abuja ↔ Kaduna** point-to-point

### Who can offer AV Drive
1. Autoverse account  
2. Owner KYC  
3. At least one vehicle with photos  
4. Preferred: AI AutoInspect above threshold → **Work-ready** badge  
5. Home city: `Abuja` or `Kaduna`

### Core flows

**Owner**
1. AV Drive entry → eligibility  
2. Select vehicle → Work-ready checklist  
3. Toggle Available + hours + job types + city  
4. Accept / decline jobs  
5. On accept: share live location while job is `in_progress` (phase 2)  
6. Complete → rating + payout log  

**Client**
1. Job type + city (or intercity) + time  
2. Set pickup / dropoff on **map** (or search address)  
3. See Work-ready partners  
4. Request → chat → pay log → rate  

---

## 4. GPS & maps — best approach (phased)

Do **not** build a full Bolt live map on day one. Build trust jobs first, then location depth.

### Phase A — MVP (ship with first AV Drive code)
| Feature | Implementation |
|---|---|
| Map on book screen | `react-native-maps` + Google Maps (Nigeria coverage) |
| Pickup / dropoff pins | Client drops two markers or searches place |
| Store coordinates | `pickup_lat/lng`, `dropoff_lat/lng` on job |
| Open in Google Maps | Button: deep link for navigation (`google.navigation` / maps URL) |
| Owner last-known city | Profile city; no continuous tracking yet |

**Why:** Clients see the route; owners navigate with Google Maps (familiar, offline-ish, no custom nav cost). We still store geo for history and disputes.

### Phase B — Active job tracking
| Feature | Implementation |
|---|---|
| Live owner location while `in_progress` | `expo-location` background/foreground; POST point every 15–30s |
| Client sees owner approaching | Map on job detail; polyline optional |
| Stop sharing on complete/cancel | Clear server-side; no retention of raw trail beyond N days (NDPR) |

### Phase C — Later (not MVP)
- Turn-by-turn inside Autoverse  
- Geofenced auto start/complete  
- Heatmaps / surge  
- Street-hail radius matching  

### Stack (Expo)
- `react-native-maps`  
- `expo-location`  
- Google Maps API key (Android + iOS) in Expo config  
- Deep link to Google Maps for “Navigate”  

### Privacy
- Location only while job is accepted / in progress (owner consent toggle)  
- No public live map of all cars  
- NDPR: document retention; purge trails after fixed window  

---

## 5. Data model

```text
av_drive_profiles     owner opt-in, cities[], job_types[], availability, home_city
av_drive_jobs         type, status, pay, times, pickup/dropoff text + lat/lng, corridor
av_drive_job_events   accept | start | complete | cancel | location_ping
av_drive_ratings      post-job ratings
av_drive_location_pings  (phase B) job_id, lat, lng, recorded_at — optional table
```

Job statuses:  
`requested → accepted → in_progress → completed | cancelled | disputed`

---

## 6. Notion ops

| Database | Purpose |
|---|---|
| **AV Drive Partners** | Owners; city (Abuja/Kaduna); badge |
| **AV Drive Jobs** | Oversight, WhatsApp notes |
| **AV Drive Disputes** | No-shows, pay, condition |

Supabase = transactions. Notion = human ops.

---

## 7. Screens

1. `AvDriveHomeScreen`  
2. `AvDriveEligibilityScreen`  
3. `AvDriveAvailabilityScreen`  
4. `AvDriveJobsScreen`  
5. `AvDriveBookScreen` — **includes map for pickup/dropoff**  
6. `AvDriveJobDetailScreen` — map snapshot + “Open in Google Maps” + later live pin  

---

## 8. API sketch

```text
POST   /av-drive/profile
GET    /av-drive/profile/me
POST   /av-drive/availability
GET    /av-drive/partners?city=&jobType=
POST   /av-drive/jobs                 # body includes pickup/dropoff lat/lng
GET    /av-drive/jobs/mine
POST   /av-drive/jobs/:id/accept
POST   /av-drive/jobs/:id/start       # begins in_progress (+ location consent)
POST   /av-drive/jobs/:id/location    # phase B pings
POST   /av-drive/jobs/:id/complete
POST   /av-drive/jobs/:id/cancel
POST   /av-drive/jobs/:id/rate
```

---

## 9. Build order

| # | Slice | Outcome |
|---|---|---|
| 1 | This spec | Cities + GPS phases locked |
| 2 | `av_drive_schema.sql` | Tables + geo columns |
| 3 | Types + routes + services | API live on backend |
| 4 | Book screen map (Phase A) | Pins + deep link navigate |
| 5 | Owner eligibility + availability | Opt-in in Abuja/Kaduna |
| 6 | Job accept/complete + ratings | Closed loop |
| 7 | Phase B live location | Only on active jobs |
| 8 | Notion partner/job DBs | Ops |
| 9 | Pilot 5–10 owners (Kaduna + Abuja) | Learn |

---

## 10. Success metrics (pilot)

- Partners approved in Kaduna vs Abuja  
- Jobs requested / accepted / completed  
- % jobs with valid pickup/dropoff coordinates  
- Dispute rate  
- “Felt safer than street apps?” feedback  

---

## 11. Copy

**Owner:** Earn with a verified car in Abuja or Kaduna — airport transfers and Abuja↔Kaduna private hire.  
**Client:** Book a Work-ready private car. See the route on the map. Not a random street pickup.  
**Trust:** Autoverse verification + optional AI AutoInspect. Structured jobs only.

---

*Owned by Autoverse / Hubil Group. Proprietary.*
