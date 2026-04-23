# Remove Placeholder Data Plan

This plan replaces mock data, hardcoded values, and placeholder UI across the mobile app and creator station with live data from the backend API.

**Guiding principles:**
- Work in phases — data wiring first, placeholder UI second, polish last.
- Each task is a single PR-sized unit of work.
- Show proper loading/empty/error states instead of falling back to mock data silently.
- `CATEGORIES` and `NARRATOR_VOICES` are static config, not placeholder data — leave them.

---

## Decisions (resolved)

| Question | Decision | Impact |
|----------|----------|--------|
| Q1: Offline mode | **Kill it** | Tasks 2.5/2.6 are simple deletions. Creator Station requires a running API. |
| Q2: Maps | **In scope — MapLibre + OpenStreetMap** | No API key needed. Phases 3.1/3.2 stay as written using `@maplibre/maplibre-react-native`. |
| Q3: Payments | **Free quests work, paid quests show error** | Remove fake card form. Free quests use existing `POST /api/purchases`. Paid quests show error message on pay button press. |
| Q4: Profile stats | **Remove XP, keep completedQuestsCount** | Add `completedQuestsCount` (aggregate from purchases) to `GET /api/users/me`. Remove `totalXP` from UI entirely. |
| Q5: Empty database | **Seed script** | Write `prisma/seed.ts` with demo quests, waypoints, author user, and sample reviews. |

---

## Phase 1 — Wire Live Data (replace mock-only screens)

These screens use mock data exclusively with **zero** API integration.

### 1.1 Profile screen → live user data
**Files:** `apps/mobile/app/(tabs)/profile.tsx`, `apps/mobile/src/store/index.ts`
**Problem:** Profile renders `MOCK_USER` directly. The auth store already fetches `GET /api/users/me` on init and stores the user object.
**Tasks:**
- Replace the `MOCK_USER` import with `useAuthStore` user state.
- Map the auth store `user` fields to what the profile screen renders (username, avatar, email, XP, completed quests count).
- Wire "Edit Profile" actions to `PATCH /api/users/me` via the existing `api.request()` method (add `updateMe()` to `ApiClient` if missing).
- Add loading spinner while `isLoading` is true, and an error/login-prompt state if `user` is null.
- **Blocked by:** nothing — the API endpoint and store already exist.

### 1.2 Checkout screen → store-driven quest data
**Files:** `apps/mobile/app/quest/checkout.tsx`
**Problem:** Imports `MOCK_QUESTS` directly instead of reading from the quest store or route params.
**Tasks:**
- Read the `questId` from the route params.
- Pull the quest from `useQuestStore.selectedQuest` or fetch it via `api.getQuest(id)` if not in store.
- Remove the `MOCK_QUESTS` import entirely.
- Wire the "Purchase" button to `useQuestStore.purchaseQuest(questId)` (already calls `POST /api/purchases`).
- Keep the card payment form visually but mark it as a **future integration** (see Phase 3.4).

---

## Phase 2 — Remove Mock Fallbacks (screens that fall back to mocks)

These screens try the API first but silently fall back to mock data on failure. Replace with proper empty/error states.

### 2.1 Play screen (home) → empty state instead of mock fallback
**Files:** `apps/mobile/app/(tabs)/index.tsx`, `apps/mobile/src/store/index.ts`
**Problem:** Falls back to `MOCK_QUESTS` when `loadQuests()` returns empty.
**Tasks:**
- In `loadQuests()`, when the API returns an empty list, set `quests: []` (it already does this — verify the screen handles it).
- In `index.tsx`, replace the `MOCK_QUESTS` fallback with an empty-state component ("No quests available yet").
- Remove the `MOCK_QUESTS` import from this file.
- Ensure loading and error states are properly displayed.

### 2.2 Quest detail screen → error state instead of mock fallback
**Files:** `apps/mobile/app/quest/[id].tsx`
**Problem:** Falls back to `MOCK_QUESTS.find(...)` when the store is empty.
**Tasks:**
- If `selectedQuest` is null, attempt `api.getQuest(id)` using the route param.
- On failure, show a "Quest not found" error screen instead of mock data.
- Remove the `MOCK_QUESTS` import.

### 2.3 Play flow → error state instead of mock fallback
**Files:** `apps/mobile/app/quest/play.tsx`
**Problem:** Falls back to `MOCK_QUESTS` if the quest isn't loaded.
**Tasks:**
- Source the active quest from `useQuestStore.activeQuest` + the full quest from the store or API.
- On failure, show an error screen with a "Return to Home" action.
- Remove the `MOCK_QUESTS` import.
- Wire scene progress to `api.updateProgress(questId, { currentSceneId })` as the player advances.

### 2.4 Scout tab → live scouted waypoints
**Files:** `apps/mobile/app/(tabs)/write.tsx`, `apps/mobile/src/store/index.ts`
**Problem:** Merges `MOCK_SCOUTED_WAYPOINTS` with local data.
**Tasks:**
- On mount, call `api.getMyScoutedWaypoints()` (already exists in `ApiClient`) and populate `useWriteStore.scoutedWaypoints`.
- Add a `loadScoutedWaypoints()` action to `useWriteStore` that fetches from the API.
- When saving a new waypoint, call `api.addScoutedWaypoint(...)` (already exists) and update local state on success.
- Remove the `MOCK_SCOUTED_WAYPOINTS` import and merge logic.
- Show empty state if user has no scouted waypoints.

### 2.5 Creator Station writer store → remove mock fallback data
**Files:** `apps/creator-station/src/store/useWriterStore.js`
**Problem:** Falls back to `mockQuests` and `mockSubmissions` when API is unavailable.
**Tasks:**
- Remove `mockQuests` and `mockSubmissions` constants.
- In the `login()` catch block (offline fallback), set `quests: []` instead of `mockQuests`.
- Initialize `submissions` from `persistedState.submissions` or `[]`, not `mockSubmissions`.
- Show proper "offline" or "could not load" messaging in the UI instead of fake data.
- **Note:** Offline mode itself can stay as a feature; just don't pre-populate it with fake content.

### 2.6 TTS service mock audio → proper error handling
**Files:** `apps/creator-station/src/services/ttsService.js`
**Problem:** `createMockAudioBlob()` returns a silent WAV when TTS is unavailable.
**Tasks:**
- Replace the silent audio blob with an explicit error/unavailable state.
- Surface a user-facing message: "Text-to-speech is not available. Record audio manually."
- Remove `createMockAudioBlob()`.

---

## Phase 3 — Replace Placeholder UI

These are visual placeholders and hardcoded values that need real implementations or proper design.

### 3.1 Maps — replace emoji placeholders with real map
**Files:** `apps/mobile/app/(tabs)/index.tsx`, `apps/mobile/app/(tabs)/write.tsx`, `apps/mobile/app/quest/play.tsx`
**Problem:** Three screens show a `🗺️` emoji instead of a real map.
**Tasks:**
- Install `react-native-maps` (or `expo-maps` if preferred).
- Replace the emoji placeholder in `index.tsx` (Play screen) with a `MapView` showing quest markers at `firstWaypointLocation`.
- Replace the emoji in `write.tsx` (Scout tab) with a `MapView` showing scouted waypoint pins, allowing tap-to-add.
- Replace the emoji in `play.tsx` (Play flow) with a `MapView` showing the active waypoint target and the player's current position.
- Request location permissions via `expo-location`.
- **Prerequisite:** Quest data must include real lat/lng coordinates (Phase 1/2 work).

### 3.2 Navigation & distance — replace simulated countdown
**Files:** `apps/mobile/app/quest/play.tsx`, `apps/mobile/src/store/index.ts`
**Problem:** Distance countdown uses `Math.random()` decrement every 2s. `estimatedDistanceMeters` is hardcoded to 2000.
**Tasks:**
- Use `expo-location` to get the player's real GPS position.
- Calculate actual distance to the target waypoint using the Haversine formula.
- Update distance display from real coordinates, not random decrements.
- In the store's quest transformer, compute `estimatedDistanceMeters` from the quest's `totalDistance` field (DB column exists) or sum of waypoint-to-waypoint distances, instead of hardcoding `2000`.
- Remove the `setInterval` / random decrement logic.

### 3.3 Completion time — replace hardcoded "32 min"
**Files:** `apps/mobile/app/quest/play.tsx`
**Problem:** Completion screen shows hardcoded "32 min".
**Tasks:**
- Track quest start time (when the user begins playback) in `usePlaybackStore` or `useQuestStore`.
- On completion, calculate elapsed time: `completedAt - startedAt`.
- Display the real elapsed time on the completion screen.
- Persist `completedAt` via `api.updateProgress(questId, { completed: true })` (endpoint exists).

### 3.4 Payment form — replace visual-only card form
**Files:** `apps/mobile/app/quest/checkout.tsx`
**Problem:** Card fields show hardcoded `4242`, `12/25`. No payment processing.
**Tasks:**
- **Option A (MVP):** Remove the fake card form. For paid quests, show "Payment coming soon" and only allow purchasing free quests via the existing `POST /api/purchases` endpoint.
- **Option B (Full):** Integrate Stripe via `@stripe/stripe-react-native`. Replace the hardcoded card fields with Stripe's `CardField` component. On submit, create a PaymentIntent server-side, confirm client-side, then record the purchase.
- The API already has a comment placeholder for Stripe integration in `purchases.routes.ts:87-88`.

### 3.5 Avatars — replace picsum URLs
**Files:** `apps/mobile/src/data/mockData.ts` (`PRESET_AVATARS`), `apps/mobile/app/(auth)/onboarding.tsx`, `apps/mobile/src/store/index.ts`
**Problem:** `PRESET_AVATARS` uses `picsum.photos` URLs. Store fallback avatars also use picsum.
**Tasks:**
- Design or source a set of real preset avatar images.
- Host them as static assets (bundle in the app or serve from the API's `/api/media/` path).
- Update `PRESET_AVATARS` to reference the real asset URLs.
- In the store's quest transformer, replace `picsum.photos/100` fallback with a local default-avatar asset.
- Replace `picsum.photos/400/300` cover image fallback with a local default-cover asset.

---

## Phase 4 — Cleanup

### 4.1 Delete `mockData.ts`
**Files:** `apps/mobile/src/data/mockData.ts`
**Tasks:**
- After Phases 1–3, no file should import from `mockData.ts`.
- Run a grep for `mockData` imports across the mobile app to confirm zero references.
- Delete the file.
- Keep `CATEGORIES` if still needed — move it to a `config/` or `constants/` file.

### 4.2 Remove mock constants from creator station store
**Files:** `apps/creator-station/src/store/useWriterStore.js`
**Tasks:**
- Confirm `mockQuests` and `mockSubmissions` are no longer referenced.
- Remove the dead code.

### 4.3 Audit remaining picsum / placeholder references
**Tasks:**
- Grep the entire repo for `picsum.photos`, `example.com`, `placeholder`, `MOCK_`, `mock`, `hardcoded`, `TODO`.
- Address any remaining references.
- Ensure all cover images, avatars, and media URLs either come from the API or from bundled default assets.

---

## Dependency Graph

```
Phase 1 (no blockers)
  ├── 1.1 Profile screen
  └── 1.2 Checkout screen

Phase 2 (no blockers, can run in parallel with Phase 1)
  ├── 2.1 Home empty state
  ├── 2.2 Quest detail error state
  ├── 2.3 Play flow error state
  ├── 2.4 Scout tab live waypoints
  ├── 2.5 Writer store mock removal
  └── 2.6 TTS mock removal

Phase 3 (depends on Phases 1 & 2)
  ├── 3.1 Real maps ← needs real lat/lng from API
  ├── 3.2 Live navigation ← needs maps (3.1)
  ├── 3.3 Completion time ← needs play flow wired (2.3)
  ├── 3.4 Payment integration ← needs checkout wired (1.2)
  └── 3.5 Real avatars ← needs asset pipeline decision

Phase 4 (depends on all above)
  ├── 4.1 Delete mockData.ts
  ├── 4.2 Clean creator station mocks
  └── 4.3 Final audit
```

---

## API Endpoints Already Available

| Endpoint | Method | Used by | Status |
|----------|--------|---------|--------|
| `/api/users/me` | GET | Profile, auth init | ✅ Exists |
| `/api/users/me` | PATCH | Profile edit | ✅ Exists |
| `/api/users/scouted-waypoints` | GET | Scout tab | ✅ Exists |
| `/api/users/scouted-waypoints` | POST | Scout tab | ✅ Exists |
| `/api/quests/public` | GET | Home screen | ✅ Exists |
| `/api/quests/:id` | GET | Quest detail, play | ✅ Exists |
| `/api/purchases` | GET | My purchases | ✅ Exists |
| `/api/purchases` | POST | Checkout | ✅ Exists |
| `/api/purchases/check/:questId` | GET | Ownership check | ✅ Exists |
| `/api/purchases/:questId/progress` | PATCH | Play flow progress | ✅ Exists |
| `/api/reviews/quest/:questId` | GET | Quest detail | ✅ Exists |
| `/api/reviews` | POST | Post-completion | ✅ Exists |

No new API endpoints are required for Phases 1–2. Phase 3 may require additions for Stripe webhooks (3.4) and avatar asset hosting (3.5).
