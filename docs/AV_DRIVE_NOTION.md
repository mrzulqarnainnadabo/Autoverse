# AV Drive — Notion ops

Human ops layer under **Hubil Client Dashboard → AUTOVERSE AV Drive Ops**.

App / Supabase remains the system of record for live bookings.

## Links

| Resource | URL |
|---|---|
| Ops hub | https://www.notion.so/3ce5db88ef4681e9b21ff74a5c294dcf |
| AV Drive Partners | https://www.notion.so/c5b97aca9edb492889512346f6faa302 |
| AV Drive Jobs | https://www.notion.so/e980dea186e944c18f3be80f85ad1109 |
| AV Drive Disputes | https://www.notion.so/5c14da1c22914b6e801c53845ae58107 |

## When to use Notion vs the app

| Use app | Use Notion |
|---|---|
| Create/accept/complete jobs | Partner pipeline (Lead → Active) |
| Live status signals | WhatsApp follow-up notes |
| Ratings, geo, chat | Jobs that need human chase |
| Availability toggle | Disputes & partner discipline |

## Partner onboard checklist

1. Add row in **AV Drive Partners** (Name, Phone, City, Source)
2. KYC → Verified; attach vehicle details
3. Mark **Work-ready** when ready for app `work_ready = true`
4. Set **Status** = Active; note Last contact

## Job ops checklist

1. For sensitive jobs (intercity, high value), mirror into **AV Drive Jobs** with App job id
2. Tick **Needs follow-up** if client/partner goes quiet
3. On dispute → create **AV Drive Disputes** row; link App job id
