# Urban Quest — Creator Station Prototype

**Writer Studio** for creating location-based interactive audio/video quests.

This is a **frontend-only prototype** demonstrating the content authoring experience for Urban Quest. Writers use this tool to create "quests" — branching narrative experiences tied to real-world locations that players experience via a mobile app.

---

## Purpose

The Creator Station enables writers to:

1. **Define waypoints** — Real-world GPS locations that anchor scenes
2. **Write screenplay-style narratives** — Scripts with branching choices
3. **Produce audio/video** — Upload recordings or generate AI narration
4. **Submit for review** — Admin approval workflow before publishing
5. **Monetize** — 33% revenue share via Stripe Connect

---

## Quick Start

```bash
npm install
npm run dev          # http://localhost:5173
```

**Optional:** For AI narration, run a Chatterbox TTS server on `http://localhost:4123` (see [TTS Integration](#tts-integration)).

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | React 19 + Vite 8 |
| **Routing** | React Router DOM 7 |
| **State** | Zustand 5 (single store) |
| **Styling** | Tailwind CSS 4 (CSS-first config via `@theme`) |
| **Icons** | Lucide React |
| **Fonts** | Bangers (headings), Courier Prime (scripts) |
| **Deployment** | Netlify (SPA redirect configured) |

---

## Project Structure

```
src/
├── components/
│   ├── layout/      # App shell (TopBar, sidebars, etc.)
│   └── ui/          # Stateless primitives (Button, Card, Input, etc.)
│
├── pages/
│   ├── write/       # Writer-facing views (dashboard, editors)
│   └── admin/       # Admin-facing views (review queue)
│
├── services/        # API clients (ttsService.js)
├── store/           # Zustand store (useWriterStore.js)
│
├── App.jsx          # Router + layout
├── main.jsx         # Entry point
└── index.css        # Tailwind theme (@theme block)
```

**Conventions:**
- `components/ui/` — Reusable, stateless. No store access. Barrel-exported via `index.js`.
- `components/layout/` — App-level layout pieces (headers, navigation).
- `pages/` — Route-level components. Can use the store. Grouped by user role.
- `services/` — External API wrappers. Handle fetch, errors, and mock fallbacks.
- `store/` — Single Zustand store. All shared state lives here.

---

## Architecture

### Routing

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Redirect → `/write` | |
| `/write` | `WriterDashboard` | Quest list, stats cards |
| `/write/quest/:id` | `QuestEditor` | Tabbed editor (Waypoints / Story / Media / Settings) |
| `/admin` | `AdminDashboard` | Review queue (separate header) |

### State Management

All application state lives in a single Zustand store (`useWriterStore`):

```
writer          → { id, name, email, stripeConnected, totalEarnings }
quests[]        → { id, title, waypoints[], scenes[], narratorVoiceId, ... }
submissions[]   → { id, questId, sceneId, status, mediaType, ... }
activeQuestId   → Currently editing quest
```

**Key actions:** `addQuest`, `updateQuest`, `addWaypoint`, `addScene`, `submitSceneMedia`, `approveSubmission`, `rejectSubmission`

### Data Model

```
Quest
├── waypoints[]    → { id, name, description, lat, lng, photo }
└── scenes[]       → { id, waypointId, script, question, choices[], audioTracks[] }
                         └── choices[] → { text, waypointId }  (branching)
```

- **Waypoints** are GPS pins on a map
- **Scenes** are narrative beats tied to waypoints
- **Choices** create branching paths by linking to other waypoints

---

## Key Features

### 1. Waypoint Editor (`WaypointEditor.jsx`)

- Visual map-style canvas (grid background, not a real map)
- Click to place pins, drag to reposition (prototype uses percentage-based positioning)
- Edit name, description, lat/lng coordinates

> **[OPEN QUESTION]** Should this integrate with a real map provider (Mapbox, Google Maps) or remain a simplified canvas for the prototype?

### 2. Screenplay Editor (`ScreenplayEditor.jsx`)

- Scene list sidebar
- Monospace text area for narrative script
- Decision prompt + branching choices (each choice links to a waypoint)

### 3. Audio Studio (`AudioStudio.jsx`)

Two modes:
- **Upload** — Drag-and-drop audio/video files, submit for admin review
- **AI Narrator** — Select voice, adjust emotion/pace/creativity sliders, generate TTS

Voice options are defined in `useWriterStore.js` (`NARRATOR_VOICES` array).

### 4. Admin Review (`AdminDashboard.jsx`)

- Filter by status (pending/approved/rejected) and media type
- Preview uploaded audio via TTS (demo uses generated sample)
- Approve/reject with notes

---

## TTS Integration

The prototype connects to a **Chatterbox TTS** server (OpenAI-compatible API):

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/audio/speech` | POST | Generate speech from text |
| `/v1/voices` | GET | List available voices |
| `/health` | GET | Health check |

**Request body:**
```json
{
  "input": "Narration text...",
  "voice": "narrator-male-deep",
  "exaggeration": 0.5,
  "cfg_weight": 0.5,
  "temperature": 0.8
}
```

If the TTS server is unavailable, `ttsService.js` falls back to a mock that returns a silent WAV blob.

> **[OPEN QUESTION]** What is the production TTS deployment strategy? Self-hosted Chatterbox, or a managed service?

---

## Styling

Tailwind 4 uses **CSS-first configuration** via `@theme` in `index.css`:

```css
@theme {
  --color-navy-deep: #0a1628;
  --color-cyan: #00d4ff;
  --color-neon-green: #39ff14;
  --color-hot-pink: #ff2d78;
  /* ... */
}
```

**Design language:**
- Dark navy background with neon accent colors
- `font-bangers` for headings (comic book style)
- `font-courier` for screenplay text
- Subtle dot-grid overlay on body (`::before` pseudo-element)

---

## Deployment

Configured for **Netlify** via `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

The SPA redirect ensures client-side routing works on refresh.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint check |

---

## Known Limitations (Prototype)

1. **No persistence** — All data is in-memory (Zustand). Refresh loses state.
2. **No authentication** — Writer/admin roles are hardcoded.
3. **No real map** — Waypoint editor uses a grid canvas, not GPS integration.
4. **No file upload backend** — Files are stored as blob URLs in memory.
5. **Mock TTS fallback** — If Chatterbox isn't running, audio is silent.

---

## Open Questions

<!-- Inline questions for future maintainers -->

1. **Backend API:** What is the shape of the production API? REST? GraphQL? What endpoints are needed for quest CRUD, media upload, and submission workflow?

2. **Authentication:** Will this use Supabase Auth, Auth0, or a custom solution? How do writer/admin roles get assigned?

3. **Map Integration:** Should the waypoint editor use Mapbox/Google Maps for real GPS placement, or is the simplified canvas sufficient for MVP?

4. **Media Storage:** Where do uploaded audio/video files live? S3? Cloudflare R2? What's the max file size?

5. **TTS Hosting:** Is Chatterbox self-hosted or will there be a managed TTS service? What about voice cloning for custom narrator voices?

6. **Mobile App:** How does the mobile player app consume published quests? Is there a shared API or does it pull from a CDN?

---

## Contributing

1. Keep UI components in `components/ui/` — they should be stateless and reusable
2. Page-level components go in `pages/` — they can use the store
3. Follow existing Tailwind patterns; avoid inline styles except for dynamic colors
4. Use `font-bangers` for headings, system font for body, `font-courier` for scripts

---

## Update: Full-Stack Platform (Current State)

> **The information above documents the original frontend-only prototype.** Since then, Urban Quest has evolved into a full-stack monorepo with a backend API, a mobile app, and real data persistence. The sections below describe where the project stands today.

### Monorepo Architecture

Urban Quest is now a **pnpm workspaces monorepo** with three apps:

| App | Stack | Purpose |
|-----|-------|---------|
| `apps/creator-station` | Vite + React 19 + TailwindCSS 4 + Zustand | Web app for creators to build quests |
| `apps/api` | Fastify 5 + Prisma (SQLite) + Zod | REST API with JWT auth, file uploads, and all CRUD operations |
| `apps/mobile` | Expo 54 + expo-router (React Native) | iOS/Android player app for discovering, purchasing, and playing quests |

### What Changed from the Prototype

**Persistence** — Data is no longer in-memory. All quests, waypoints, scenes, users, purchases, and reviews are stored in a SQLite database via Prisma ORM. The Zustand store now syncs with the API instead of holding state alone.

**Authentication** — Real auth flows replaced the hardcoded roles. The API supports Google OAuth, Apple Sign-In, and a dev bypass mode. JWT tokens authenticate both the Creator Station (cookie-based) and the mobile app (Bearer token). Users have roles: `player`, `writer`, `admin`.

**API Layer** — A Fastify 5 API (`apps/api`) handles all backend logic with a feature-first folder structure:
- `features/quests/` — Quest CRUD, waypoint/scene management, media uploads, submission workflow
- `features/users/` — Auth (Google, Apple, dev), profile management, scouted waypoints
- `features/purchases/` — Purchase flow, ownership checks, progress tracking
- `features/reviews/` — Player ratings and comments

**Media Uploads** — Scene audio/video and scouted waypoint media are uploaded via multipart form data to `apps/api/uploads/` and served at `/api/media/`. No more blob URLs.

**Mobile App** — A full React Native app with:
- **Explore tab** — Browse and search published quests with filters (genre, difficulty, city)
- **Library tab** — View purchased quests and resume progress
- **Scout tab** — Drop GPS pins, attach photos/videos/audio recordings, and save waypoints for later use in the Creator Station
- **Profile tab** — User settings and account management

**Saved Waypoints (Scout → Creator Station)** — Creators can scout real-world locations from the mobile app (capturing GPS, notes, photos, videos, and audio), then pull those scouted waypoints into the Creator Station when building quests. This bridges fieldwork and desk authoring.

**Admin Portal** — The admin review queue at `/admin` now reads from the real database, showing actual pending submissions with uploaded media.

### Updated Commands

All commands run from the monorepo root:

| Command | Description |
|---------|-------------|
| `pnpm api:dev` | Start the API server (tsx watch, port 3001) |
| `pnpm creator:dev` | Start Creator Station (Vite, port 5173) |
| `pnpm mobile:start` | Start Expo dev server (Metro, port 8081) |
| `pnpm mobile:ios` | Start Expo + open iOS simulator |
| `pnpm api:db:studio` | Open Prisma Studio (database GUI) |
| `pnpm api:db:push` | Push Prisma schema changes to the database |

### Updated Data Model

```
User
├── quests[]            → Quest (author relationship)
├── purchases[]         → Purchase (player relationship)
├── reviews[]           → Review
└── scoutedWaypoints[]  → ScoutedWaypoint (mobile scouting)

Quest
├── waypoints[]         → Waypoint { name, lat, lng, photo }
├── scenes[]            → Scene { script, question, choices[], media }
├── purchases[]         → Purchase { amount, progress }
└── reviews[]           → Review { rating, comment }

ScoutedWaypoint         → { name, notes, lat, lng, photos[], videos[], audioRecordings[] }
```

### Resolved Open Questions

| Original Question | Resolution |
|---|---|
| Backend API shape? | REST API via Fastify 5 with feature-based routing. Zod for validation. |
| Authentication? | JWT via `@fastify/jwt`. Google OAuth, Apple Sign-In, and dev bypass. |
| Map integration? | Creator Station still uses a simplified canvas. Mobile uses GPS for scouting. |
| Media storage? | Local disk (`apps/api/uploads/`) served via `@fastify/static`. Cloud storage is a future concern. |
| TTS hosting? | Chatterbox TTS integration remains — self-hosted, with mock fallback. |
| Mobile app? | Expo 54 React Native app with tab navigation, quest playback, and scouting. |

### Remaining Known Limitations

1. **SQLite** — Suitable for development; Postgres migration planned for production.
2. **Local file storage** — Uploads live on disk, not cloud storage (S3/R2) yet.
3. **No payment processing** — Purchase flow exists but Stripe integration is not wired up.
4. **No real map in Creator Station** — Waypoint editor still uses the grid canvas (mobile uses real GPS).
5. **No shared packages** — `packages/` directory is reserved but apps share no runtime code yet.
