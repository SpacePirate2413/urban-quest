# Future Tasks

Items that have been explicitly captured for later. As they ship, mark them `[x]` and link the commit / PR.

---

## Infrastructure

### [ ] Migrate media uploads from local disk to S3-compatible storage

**Today**: Uploaded scene media and scouted-waypoint media land on the api server's local disk at `apps/api/uploads/`, served by `@fastify/static` at `/api/media/`. Works fine in dev. Captured in: scene upload route (`apps/api/src/features/quests/quests.routes.ts`), scouted upload route (`apps/api/src/features/users/users.routes.ts`).

**Why this needs to change before any real production deploy**:
- The api can't run on more than one instance (each one has its own disk; uploads to instance A would 404 from instance B).
- Hosts without persistent disk (Render free tier, Fly without volumes, ECS Fargate without EFS) will lose every upload on restart / redeploy.
- Backups are manual.
- No CDN in front of media.

**Proposed approach**:
1. Pick a provider — **Cloudflare R2** (S3-compatible API, no egress fees, ~$0.015/GB/mo) is the recommended starting point. AWS S3 also fine; Backblaze B2 cheapest.
2. Add `@aws-sdk/client-s3` to api deps; configure with provider endpoint + credentials in env.
3. Replace the `pipeline(data.file, fs.createWriteStream(...))` pattern in both upload routes with `s3.send(new PutObjectCommand(...))`.
4. Update the `/api/media/*` static route to either (a) return signed CloudFront / R2 URLs that the client fetches directly, or (b) proxy through the api (slower, but simpler to swap in).
5. One-time migration script: walk `apps/api/uploads/`, push each file to the bucket, rewrite Quest/Scene/ScoutedWaypoint URLs in the DB.
6. Delete the local `uploads/` mount + the static-serving route.

**When to do this**: as soon as a deployment target is picked. Local-disk MVP is fine until then.

---

## See also

These threads are tracked in `docs/Questions-Left.md` (compliance) and the conversation that captured them, but listed here for quick reference:

- Remove `offlineMode` in creator-station (closes the ghost-quest data divergence class).
- Lock down `/api/admin/*` routes — currently unauthenticated, must require auth + admin role before any production deploy.
- SQLite → Postgres migration (managed: Neon, Supabase, Railway, RDS).
- Real Apple/Google OAuth configuration to replace `devLogin`.
- Geocoding upgrade: OpenStreetMap Nominatim → Mapbox Geocoding or Google Places (better local-business coverage in waypoint search).
- Mobile networking: replace hardcoded `localhost:3001` with an env-driven base URL so real devices can hit a deployed api.
