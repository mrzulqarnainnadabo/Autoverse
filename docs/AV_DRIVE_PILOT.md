# AV Drive — Pilot checklist (phone-friendly)

## Done

- [x] Supabase tables (`av_drive_*`)
- [x] API routes + service in repo
- [x] Mobile screens + `AvDriveNavigator`
- [x] Notion Partners / Jobs / Disputes

## Blocker: API must be live

Mobile talks to **Express**, not Supabase tables directly for AV Drive.

### Env vars on the API host (Vercel or Railway)

| Variable | Source |
|----------|--------|
| `SUPABASE_URL` | `https://lbvydqkwfvpguvvhrcfx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role |
| `DATABASE_URL` | Supabase → Database → pooler URI (port 6543) |
| `ANTHROPIC_API_KEY` | Optional for AV Drive; health may show degraded without it |
| `NODE_ENV` | `production` |

### Mobile `.env`

```
EXPO_PUBLIC_SUPABASE_URL=https://lbvydqkwfvpguvvhrcfx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
EXPO_PUBLIC_API_BASE_URL=https://<your-api-host>
```

### Smoke test

1. `GET https://<api>/health` → status ok or degraded
2. Sign in on Expo
3. AV Drive → Start earning → save Abuja + airport
4. In SQL (admin): `UPDATE av_drive_profiles SET work_ready = true WHERE user_id = '<uuid>';`
5. Toggle Available on
6. Second account → Book a car → Request job
7. Partner → Accept → On the way → Arrived → Complete

## Notion

Replace placeholder partners with real owners: [AV Drive Partners](https://www.notion.so/c5b97aca9edb492889512346f6faa302)
