# Questions Left — Urban Quest Store-Compliance Tracker

Running list of decisions and tasks needed to get **Urban Quest** (mobile + desktop) fully compliant for the **Apple App Store** and **Google Play Store**. As items are answered/completed, mark them `[x]` and move them to the bottom.

Companion doc: [`app-store-readiness.md`](./app-store-readiness.md) — the deeper App Store requirements checklist sourced from the @damidefi guide.

---

## ⭐ Next Recommended Task

> **External account setup so the in-app paths actually function.** All four A6 chunks are coded and the app boots cleanly in dev with placeholders / test ad IDs. To turn it on for real you need to register the apps with each provider and drop the real keys into the build environment:
>
> 1. **App Store Connect** — create the app record with bundle ID `com.urbanquest.app`. Create the IAP products: `com.urbanquest.app.premium.monthly` (auto-renewable subscription, $5.99/mo) and one non-consumable per price tier (`com.urbanquest.app.quest.tier_99` through `_999`).
> 2. **Google Play Console** — same products in Play Console (subscription + non-consumable in-app products).
> 3. **RevenueCat** — create the project, add an iOS app and Android app pointing at the bundle/applicationId; copy the public API keys → set `EXPO_PUBLIC_REVENUECAT_IOS_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` for builds. Configure the "premium" entitlement attached to the monthly subscription, and a "default" offering that surfaces the monthly package.
> 4. **AdMob** — register the app, get real App IDs and Interstitial Ad Unit IDs. Replace the test IDs in `app.json` with the real `androidAppId`/`iosAppId`, and set `EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS` / `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID`.
> 5. **Stripe** — create a Stripe account (test mode is fine for dev) and turn on Connect → Platforms. Set `STRIPE_SECRET_KEY` (and the Connect return/refresh URLs) in `apps/api/.env`.
>
> After these are filled in, the next code-side leverage points are: **A21** (update Privacy Policy on WordPress to disclose AdMob/IDFA), **A23** (update App Store Connect privacy form — answers in `docs/privacy-data-inventory.md`), **A11** (capture screenshots), **A17** (paste reviewer notes), and **A14** (Apple age-rating questionnaire).

---

## Open Questions — answer these to unblock work

### Identity & Accounts
- [x] **Q2.** iOS bundle ID = **`com.urbanquest.app`** (answered 2026-04-25). Applied to `apps/mobile/app.json`.
- [x] **Q3.** Android `applicationId` = **`com.urbanquest.app`** (matches iOS — answered 2026-04-25). Applied to `apps/mobile/app.json`.
- [x] **Q4.** Apple Developer Program — **active, Organization, Blue Pelican Digital LLC** (answered 2026-04-26).
- [x] **Q5.** Google Play Console — **active, Organization, Blue Pelican Digital LLC** (answered 2026-04-26). Org account = no 20-tester / 14-day closed-test pre-launch requirement.
- [N/A] **Q6.** Mac Developer ID / Microsoft Partner Center — **not needed** since Creator Station ships web-only (Q1 = a).

### Product & Monetization
- [x] **Q7.** iPad at v1 = **no** (answered 2026-04-26). `supportsTablet` set to `false` in `apps/mobile/app.json`. Revisit for v1.1.
- [x] **Q8.** Monetization model = **Freemium** (answered 2026-04-26). StoreKit + Google Play Billing **on v1 critical path**.
- [x] **Q8a.** Three-pronged monetization (answered 2026-04-26):
  1. **Free quests** play ad-supported (interstitial ad after each scene).
  2. **Paid quests** — creator picks the price (constrained to Apple/Google price tiers — see Q8b).
  3. **Premium subscription = $5.99/mo** removes ads. Does NOT unlock paid quests (those are still purchased individually).
- [x] **Q9.** IAP-only on mobile (answered 2026-04-26). Digital goods sold via Apple/Google IAP only — no parallel web checkout for the same items, no in-app reference to web pricing. Sidesteps Apple/Google anti-steering scrutiny.

### Legal & Hosting
- [x] **Q10.** Privacy Policy hosted at **https://urbanquestapp.com/privacy-policy/** (effective 2026-01-15). Snapshot saved to [`docs/policies/privacy-policy.md`](./policies/privacy-policy.md). Confirmed via WebFetch on 2026-04-26.
- [x] **Q11.** Terms & Conditions hosted at **https://urbanquestapp.com/terms-conditions/** (effective 2026-02-06). Snapshot saved to [`docs/policies/terms-conditions.md`](./policies/terms-conditions.md). Section 15 covers the Apple EULA pass-through, so this doc satisfies both Q11 and the EULA half of X9.
- [x] **Q12.** Account Deletion (answered 2026-04-26):
  - **Public URL** = **https://urbanquestapp.com/account-deletion/**. Page body drafted in `docs/account-deletion.md` for WordPress paste-in.
  - **In-app flow** = required in addition to the public page; tracked as new code task **A19** below.
- [x] **Q13.** Listing company name = **Blue Pelican Digital LLC** (answered 2026-04-26 alongside Q4/Q5).
- [x] **Q14.** Public support email = **support@urbanquestapp.com** (active inbox; answered 2026-04-26). Corrected versions of policies prepared in `docs/privacy-policy.md` + `docs/terms-conditions.md` for the WordPress site update.

### UGC & Moderation
- [x] **Q15.** UGC requirement audit (answered 2026-04-26 by code search):
  - ✅ **Pre-publish moderation queue** — exists. Admin portal at `apps/creator-station/src/pages/admin/AdminDashboard.jsx`; backend at `apps/api/src/features/admin/admin.service.ts` (quest + scene `submissionStatus` flow, `notifyUser('quest:approved')` on approval).
  - ❌ **Report Content** — does not exist. Required in mobile on every UGC item (quest, scene, creator profile).
  - ❌ **Block User** — does not exist. Required in mobile.
  - ❌ **EULA** — `apps/mobile/app/(auth)/login.tsx:55-57` references Terms of Service in text but there's no linked document or hosted page. Required and must explicitly prohibit objectionable content.
- [x] **Q16.** Moderation ownership at launch (answered 2026-04-26):
  - **At launch:** Brent personally approves every quest via admin portal (existing flow). Personal approval satisfies the proactive side of the requirement.
  - **Post-launch:** automate moderation — see the **Automated Moderation Roadmap** section below.

### Reviewer Logistics
- [x] **Q17.** Demo seed data locations (answered 2026-04-26):
  - **Apple reviewers** — cluster of 3–5 waypoints in/around **One Apple Park Way, Cupertino, CA 95014** (≈ 37.3349°N, 122.0090°W). Walkable from Apple's review-center buildings.
  - **Google Play reviewers** — separate cluster near **Googleplex, 1600 Amphitheatre Parkway, Mountain View, CA 94043** (≈ 37.4220°N, 122.0841°W).
- [x] **Q18.** Reviewer demo account (decided 2026-04-26): **`reviewer@urbanquestapp.com`** (we control the address); strong password to be generated when the account is created. Account must be pre-loaded with at least one free quest near each demo cluster (Q17) **and** at least one purchased premium quest so the reviewer hits the IAP-unlocked experience even on a fresh install.

### Monetization sub-decisions (opened by Q8a)
- [x] **Q8b.** Creator price tiers (answered 2026-04-26): **Free (ad-supported), $0.99, $1.99, $2.99, $4.99, $9.99.** Curated short list — quest settings UI offers these as a dropdown, not free-form pricing.
- [x] **Q8c.** Ad SDK = **Google AdMob** via `react-native-google-mobile-ads` (answered 2026-04-26).
- [x] **Q8d.** Ad cadence (answered 2026-04-26): max 1 interstitial per 2 scenes, 60-second minimum between any two interstitials. Skip entirely for Premium subscribers.
- [x] **Q8e.** Paid-quest revenue split (answered 2026-04-26): **70% creator / 30% platform**, calculated after Apple/Google's 15–30% cut.
- [x] **Q8f.** Ad revenue split (answered 2026-04-26): **100% platform at launch.** Revisit a creator share in v1.x once we have audience traction data.
- [x] **Q8g.** Creator payouts (answered 2026-04-26): **Stripe Connect Express**, web-only flow (never inside the iOS app — anti-steering compliance).
- [x] **Q8h.** Premium subscription (answered 2026-04-26): product ID = **`com.urbanquest.app.premium.monthly`**, $5.99/mo, **no free trial at launch**. Revisit a 7-day trial in v1.1 once we have retention data.

### Tech & Compliance
- [x] **Q19.** Third-party SDK audit completed (2026-04-26). **Result: codebase is unusually clean.** No analytics, crash reporting, ads, attribution, or tracking SDKs in `apps/mobile`, `apps/api`, or `apps/creator-station`. Only third-party data services are Apple Sign In + Google Sign In (already declared in policy). Full audit + master data-type inventory in [`docs/privacy-data-inventory.md`](./privacy-data-inventory.md). One known forward gap: RevenueCat is referenced in the Privacy Policy §3 but not yet installed — will land with **A6**.
- [x] **Q20.** Background location = **no** at launch (answered 2026-04-26). In-use only. Added `NSLocationWhenInUseUsageDescription` to `apps/mobile/app.json`. Skipped `NSLocationAlwaysAndWhenInUseUsageDescription` and Android `ACCESS_BACKGROUND_LOCATION`. Revisit for v1.x if a real user need emerges.
- [x] **Q21.** No health, financial, or children's data (confirmed 2026-04-26). Policy correctly states 13+; app does not target children, so Apple Kids Category and Google Designed-for-Families do not apply. No HIPAA-adjacent data. Card numbers never reach our systems (RevenueCat/Apple/Google handle them).

---

## Compliance Tasks — work to do once questions above land

### Apple App Store (`apps/mobile` iOS build)
- [x] **A1.** Replaced bundle ID in `apps/mobile/app.json` with `com.urbanquest.app` (2026-04-25).
- [x] **A2.** Added `NSLocationWhenInUseUsageDescription` to `apps/mobile/app.json` (2026-04-26). `NSLocationAlwaysAndWhenInUseUsageDescription` skipped per Q20 = in-use only.
- [x] **A3.** Privacy Policy live at https://urbanquestapp.com/privacy-policy/. Linked from mobile login screen with a required acknowledgement checkbox (`apps/mobile/app/(auth)/login.tsx`).
- [~] **A4.** Public URL drafted in `docs/account-deletion.md` (pending WordPress publish at `urbanquestapp.com/account-deletion/`). In-app flow split out as **A19**.
- [x] **A5.** Report Content + Block User shipped end-to-end (2026-04-26). Subtasks X4–X8 individually marked done below.
- [x] **A6.** Monetization stack shipped end-to-end (2026-04-26) across four chunks:
  1. **Chunk 1 — RevenueCat + Premium.** `react-native-purchases` installed; `apps/mobile/src/lib/monetization.ts` defines product IDs / entitlement / curated tier list; `apps/mobile/src/hooks/useSubscription.ts` exposes `isPremium`/`purchasePremium`/`restorePurchases` + a non-React `isPremiumNow()` for the ad gate; `apps/mobile/app/profile/premium.tsx` is the paywall (Apple-compliant copy, restore button, auto-renew disclosure); Profile screen now has a "Go Premium" card.
  2. **Chunk 2 — Per-quest IAP + creator price-tier picker.** `apps/creator-station/src/pages/write/QuestSettings.jsx` replaces the free-text price input with a dropdown of the curated tiers; `apps/api/src/features/quests/quests.routes.ts` validates submitted prices against the allowed list (rejects arbitrary amounts); `purchaseQuestProduct(productId)` in `useSubscription` triggers the IAP; `apps/mobile/app/quest/checkout.tsx` routes paid purchases through RevenueCat then records the entitlement server-side via `POST /purchases` with the RevenueCat transaction id; backend `purchases.routes.ts` rejects paid-quest creates without a transaction id.
  3. **Chunk 3 — AdMob + ATT + UMP.** `react-native-google-mobile-ads` + `expo-tracking-transparency` installed and configured in `app.json` with test App IDs (real IDs to come from EXPO_PUBLIC_* env at build time); `apps/mobile/src/lib/adConsent.ts` orchestrates UMP → AdMob init → ATT prompt at app boot; `apps/mobile/src/hooks/useInterstitial.ts` enforces the frequency cap (max 1 per 2 scenes, 60s minimum, gated on `isPremiumNow()`); `apps/mobile/app/quest/play.tsx` calls `maybeShowAdAtSceneBoundary()` between waypoints for free quests only.
  4. **Chunk 4 — Stripe Connect Express.** `stripe` SDK installed in `apps/api`; `User.stripeConnectAccountId` + `stripeConnectStatus` added to Prisma; new `apps/api/src/features/payouts/payouts.routes.ts` with `GET /me/payouts` (live status sync), `POST /me/payouts/onboarding-link`, `GET /me/payouts/dashboard-link`; `apps/creator-station/src/pages/profile/CreatorProfile.jsx` Monetization card now shows real connection status with Connect/Finish-setup/Manage CTAs; revenue-share copy updated from 33% → 70% per Q8e.
- [ ] **A7.** Audit minimum tap targets ≥ 44pt across `apps/mobile`.
- [ ] **A8.** Verify Dynamic Type support across the app.
- [ ] **A9.** Verify safe-area insets on notched + Dynamic-Island devices.
- [x] **A10.** iPad support disabled — `supportsTablet: false` in `apps/mobile/app.json` (2026-04-26). No iPad screenshots needed for v1.
- [ ] **A11.** Capture **iPhone 6.5" + 5.5"** screenshots from a clean simulator. Set the simulator's location to the Cupertino cluster (Q17) so the map and waypoint UIs render with seeded data. iPad screenshots not required since A10/Q7 = iPhone-only at v1.
- [ ] **A12.** Write the App Store description (first 3 lines = the hook), subtitle, keywords (100 chars).
- [ ] **A13.** Complete the **App Privacy** nutrition labels in App Store Connect. Answers prepared in [`docs/privacy-data-inventory.md`](./privacy-data-inventory.md) — every category, linked/tracking flag, and purpose pre-filled to copy in. Waiting on App Store Connect record creation.
- [ ] **A14.** Complete the **Age Rating** questionnaire — answer for max-possible UGC content, not just current.
- [x] **A15.** Privacy Manifest at `apps/mobile/ios/urbanquest/PrivacyInfo.xcprivacy` updated (2026-04-26). Required-Reason APIs preserved as Expo generated them; `NSPrivacyCollectedDataTypes` filled out for all 11 categories we collect (email, name, user ID, precise location, photos/videos, audio, other user content, product interaction, crash data, performance data, other diagnostic). `NSPrivacyTracking = false`. **Re-verify when RevenueCat (A6) and AdMob (A6) are added — AdMob will flip `NSPrivacyTracking` to `true` and add `NSPrivacyCollectedDataTypeAdvertisingData` if IDFA is requested.**

### Ad-related compliance work (opened by Q8a)
- [x] **A20.** ATT permission string added via the `react-native-google-mobile-ads` + `expo-tracking-transparency` plugin configs in `app.json` (2026-04-26).
- [ ] **A21.** Update Privacy Policy Sections 1, 2, 4 to disclose: AdMob as a data sub-processor, IDFA collection (linked to ATT consent), ad-targeting purpose, and a link to Google's ads-personalization opt-out. Send to WordPress dev. **(Open — content task, not code.)**
- [x] **A22.** Privacy Manifest flipped: `NSPrivacyTracking = true`, `NSPrivacyTrackingDomains` populated, `NSPrivacyCollectedDataTypeDeviceID` + `NSPrivacyCollectedDataTypeAdvertisingData` declared with `NSPrivacyCollectedDataTypePurposeThirdPartyAdvertising` (2026-04-26).
- [ ] **A23.** Update App Store Connect App Privacy form to add "Identifiers → Device ID" Tracking = Yes. **(Open — store form, no code.)** Inputs ready in `docs/privacy-data-inventory.md`.
- [x] **A24.** `docs/privacy-data-inventory.md` updated with AdMob/IDFA rows and a tracking-domains note (2026-04-26).
- [x] **A25.** UMP wired in `apps/mobile/src/lib/adConsent.ts` — runs at app boot, calls `AdsConsent.requestInfoUpdate` → `AdsConsent.showForm()` for EEA/UK users; falls back to non-personalized ads if UMP fails (2026-04-26).
- [ ] **A16.** Run a TestFlight build on **two physical iOS devices** end-to-end before submission.
- [ ] **A17.** Fill reviewer notes (App Store Connect + Play Console). Inputs ready: demo creds = `reviewer@urbanquestapp.com` + password (Q18); demo coords = Apple Park 37.3349°N / 122.0090°W (Apple) and Googleplex 37.4220°N / 122.0841°W (Google) (Q17); flow note = "set simulator/device location to the coords above, sign in with the demo account, tap any waypoint pin → start quest. The pre-purchased premium quest is in the 'My Quests' tab and demonstrates the IAP-unlocked playback path."
- [x] **A18.** `expo-location` shipped (2026-04-26).
  - Installed `expo-location ~19.0.8` via `npx expo install`.
  - Registered the **expo-location config plugin** in `apps/mobile/app.json` with our specific `locationWhenInUsePermission` purpose string and `isIosBackgroundLocationEnabled: false` / `isAndroidBackgroundLocationEnabled: false` (matches Q20). Removed the manual `NSLocationWhenInUseUsageDescription` from `infoPlist` so the plugin is the single source of truth.
  - Added `apps/mobile/src/hooks/useLocationTracking.ts` — requests foreground permission once on mount, then `Location.watchPositionAsync` (10m / 5s) piping coordinates into `useLocationStore.setCurrentLocation`. Mounted from `apps/mobile/app/(tabs)/_layout.tsx` so tracking starts when the user reaches the main app and tears down on unmount.
  - Replaced the **fake** permission flow in `apps/mobile/app/(auth)/onboarding.tsx` (which used to set `granted/denied` based on which button was tapped, never invoking iOS) with a real `Location.requestForegroundPermissionsAsync()` call.
  - The privacy claim — declared in `app.json`, the live Privacy Policy, and the App Privacy summary — is now consistent with what the app actually does.
- [x] **A19.** In-app account deletion flow shipped (2026-04-26).
  - Backend: `usersService.delete` (`apps/api/src/features/users/users.service.ts`) now anonymizes the user record in a transaction — drops Reviews, Purchases, ScoutedWaypoints, and draft/archived Quests; keeps published Quests with the user row anonymized so author FKs stay valid. Added `deletedAt` field to Prisma User; `findById`/`findByEmail`/`findByProvider` now treat deleted users as non-existent so stale tokens don't see ghost data.
  - Mobile API client (`apps/mobile/src/services/api.ts`): added `deleteAccount()`.
  - Auth store (`apps/mobile/src/store/index.ts`): added `deleteAccount` action.
  - UI: `apps/mobile/app/(tabs)/profile.tsx` now has a "Delete Account" button below Sign Out, opens a confirmation modal showing exactly what's deleted vs. retained per `docs/account-deletion.md`. Confirm → API call → routed to login.

### Google Play Store (`apps/mobile` Android build)
- [x] **G1.** Set Android `applicationId` to `com.urbanquest.app` in `apps/mobile/app.json` (2026-04-25).
- [ ] **G2.** Verify **target API level** meets Google's current minimum (currently API 35 / Android 15 for new submissions in 2026).
- [ ] **G3.** Android runtime permissions: camera, microphone, photos, **fine + coarse location** (auto-injected once `expo-location` plugin is added per A18). `ACCESS_BACKGROUND_LOCATION` **not needed** per Q20.
- [ ] **G4.** Build a signed **Android App Bundle (.aab)** (Play Store requires `.aab`, not `.apk`).
- [ ] **G5.** Complete the **Data Safety** form in Play Console. Answers prepared in [`docs/privacy-data-inventory.md`](./privacy-data-inventory.md) — every category mapped to Google's vocabulary with shared/encrypted/deletion flags pre-filled. Waiting on Play Console listing creation.
- [ ] **G6.** Complete the **Content Rating** questionnaire (IARC) — declare UGC if applicable (Q15).
- [ ] **G7.** Configure **Account Deletion** in Play Console pointing to the public URL from A4.
- [ ] **G8.** Run an **internal testing track** → **closed testing track** (Google's new policy requires 20 testers for 14 days for personal accounts before production).
- [ ] **G9.** Capture Android phone + 7"/10" tablet screenshots from a clean emulator with seed data.
- [ ] **G10.** Write Play Store short description (80 chars) + full description (4000 chars) + feature graphic + app icon (512×512).
- [x] **G11.** Folded into **A6** (RevenueCat covers Google Play Billing). One SDK, both stores. Shipped 2026-04-26.

### Desktop / Mac App Store
**N/A — Creator Station ships web-only per Q1 (answered 2026-04-25).** D1–D7 retired. Cross-cutting items (X1–X3) still apply to the web app for SEO/legal hygiene.

### Security follow-ups (out of v1 critical path but flagged)
- [ ] **S1.** Apply `requireAdmin` (auth + `role='admin'` check) to the existing admin routes under `/api/admin/submissions*` in `apps/api/src/features/admin/admin.routes.ts`. Currently any unauthenticated request can hit those endpoints — pre-existing gap, not introduced by the moderation work. New `/api/admin/reports/*` endpoints already use `requireAdmin`. Fix is ~10 lines plus setting Brent's account `role='admin'` in the DB so the creator-station admin portal still works after the lockdown.

### Tech-debt follow-ups (functional but worth doing right)
- [ ] **A26.** Replace data-URI cover-image storage with a proper multipart upload. **Quick fix shipped 2026-04-27:** Fastify `bodyLimit` bumped to 10 MiB so cover images go through as `data:image/...;base64,...` strings inside the JSON body of `PATCH /quests/:id`, and `apps/api/src/features/quests/quests.routes.ts` accepts that shape. This works but is wasteful — base64 is ~33% larger than the raw bytes, the encoded string lives in the DB row, and every `getMyQuests` / `getQuest` payload drags it along. Proper fix: `POST /quests/:id/cover-image` accepting multipart/form-data, store the file under `apps/api/uploads/`, write a `/api/media/cover-{questId}-{ts}.jpg` URL into `Quest.coverImage`. The admin portal renders that URL the same way it renders existing data URIs, so the swap is mostly creator-side (file picker → fetch + FormData instead of FileReader.readAsDataURL).
- [ ] **A27.** Production hosting for Chatterbox TTS. The new AI Narrate modal hits `http://localhost:4123` directly from the browser (works in dev because Chatterbox sets `CORS_ORIGINS='*'`). Deployed creator-station won't have access to a localhost server, and we don't want creators' browsers calling our self-hosted TTS box directly in prod regardless. Two viable shapes: **(a)** deploy Chatterbox to its own host (Render, Fly.io, or a VPS with GPU) and lock CORS to `urbanquestapp.com`; or **(b)** proxy through `apps/api` so the API is the single network boundary (requires `POST /api/tts/voices/:name/preview` and `POST /api/tts/generate` endpoints that forward to Chatterbox internally). **(b)** is more work but gives us auth, rate-limiting, and per-creator quotas in one place. Default recommendation: **(b)**.
- [ ] **A28.** Convert AI-narration WAV → Opus/MP3 on the server. The current modal saves results as `.wav` (chatterbox's native output). WAV is uncompressed — ~3 MB per minute of audio. With Q8a's freemium model and Q6a's unrestricted generation, a single creator iterating on a 5-scene quest can easily push 100 MB to `apps/api/uploads/` per hour. Fix: in `apps/api/src/features/quests/quests.routes.ts`'s scene upload handler, detect `audio/wav` and re-encode to Opus (preferred — smallest, ubiquitous in 2026) or MP3 via `ffmpeg`. Targets ~10× size reduction with no audible quality loss for narration. Bonus: shorter mobile downloads.

### OAuth provider configuration (you do these out-of-band)
- [ ] **C2.** **Google OAuth client IDs.** Real Google sign-in (mobile + creator-station web) needs three client IDs created at https://console.cloud.google.com/apis/credentials:
  1. **iOS** — Application type "iOS", bundle ID `com.urbanquest.app`. Set `EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS` in `apps/mobile/.env`.
  2. **Android** — Application type "Android", package name `com.urbanquest.app`, with the SHA-1 fingerprint of your release keystore (or debug keystore for dev). Set `EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID`.
  3. **Web** — Application type "Web", with authorized redirect URI `http://localhost:3001/api/users/auth/google/callback` (dev) **plus** the production callback once API is hosted. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `apps/api/.env`. The mobile flow ALSO uses this web client ID for `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB` (Google's `/tokeninfo` `aud` field on mobile id tokens contains this web ID, not the iOS one).
- [ ] **C3.** **Apple Sign In service.** At https://developer.apple.com/account/resources, in your team:
  1. Enable "Sign In with Apple" capability on the iOS app identifier `com.urbanquest.app`.
  2. Create a Sign In with Apple **Services ID** (e.g. `com.urbanquest.app.signin`) for the API's server-to-server token verification.
  3. Create a **Sign In with Apple key** (.p8 file, downloads once). Store securely.
  4. Set `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` (the .p8 contents, with `\n` for line breaks) in `apps/api/.env`.
  5. Mobile-side config is done by the `usesAppleSignIn: true` flag in `apps/mobile/app.json` — Expo handles the entitlement on the next build.
- [ ] **C4.** **Apple Sign In on web (creator-station).** Optional. Currently the web app only offers Google + email sign-in. If you want Apple on the web too, that requires the Services ID from C3 plus an Apple JS SDK integration on the login screen. Not a hard requirement — most creators will sign in via Google or email on the web.

### Content tasks (you do these out-of-band)
- [x] **C1** (2026-04-28) — All 8 narrator voices sourced and uploaded to Chatterbox. Library now contains `marcus`, `elena`, `jake`, `lily`, `arthur`, `margaret`, `draven`, `vex`. Sizes 545 KB–2486 KB each. AI Narrate modal now shows all 8 as clickable cards with preview buttons. Note: the `POST /v1/voices` form field is `voice_name`, not `name` — `scripts/upload-narrator-voice.sh` updated accordingly.
- [x] **Real Apple + Google sign-in code paths shipped** (2026-04-28). Mobile: `expo-apple-authentication` for native iOS Sign In with Apple, `expo-auth-session/providers/google` for Google (iOS + Android). Backend exchange via `POST /api/users/auth/mobile/token` (already existed). Creator-station: redirect-based Google web OAuth that lands at `/auth/callback#token=<jwt>`, with a new `AuthCallback` route that pulls the token out of the URL fragment, stores via `api.setToken`, and routes to `/write`. Backend `googleCallbackHandler` now hands the JWT back via the URL fragment (safer than query string, never reaches server logs). The dev email/name sign-in remains as a fallback in both surfaces. **Won't actually authenticate against Apple/Google until C2 + C3 OAuth credentials are configured.**

### Cross-cutting (mobile + web)
- [ ] **X1.** Single source of truth for: privacy policy, terms, account deletion, support email, company name. Reuse on every store listing.
- [x] **X2.** Centralized data-collection inventory at [`docs/privacy-data-inventory.md`](./privacy-data-inventory.md) (2026-04-26). Single source of truth for Apple App Privacy form, Google Play Data Safety form, the live Privacy Policy, and the iOS Privacy Manifest. Has a maintenance protocol at the bottom for keeping them in sync.
- [ ] **X3.** Decide on a release versioning convention shared across platforms (`1.0.0` everywhere is fine to start).
- [x] **X4.** Prisma `Report` (polymorphic — entityType/entityId), `UserBlock`, plus `User.suspendedAt` and `User.bannedAt`. `db push` applied (2026-04-26).
- [x] **X5.** Backend endpoints. User-facing: `POST /reports`, `POST/DELETE /users/:id/block`, `GET /me/blocks`. Admin: `GET/POST /admin/reports*` behind a new `requireAdmin` (JWT + role='admin') hook. Living in `apps/api/src/features/moderation/`.
- [x] **X6.** Report sheet at `apps/mobile/src/components/moderation/ReportSheet.tsx` with all 9 reason categories + free-text details, exposed via `ContentMenu` (overflow ⋯ in the quest-detail header). Reportable entity scope: quest, scene, review, user (waypoint excluded — covered by reporting the parent quest).
- [x] **X7.** Block creator wired into `ContentMenu` → confirmation alert → `api.blockUser`. Backend `getQuests` now accepts a viewer ID and filters out blocked-author quests + always filters banned/deleted authors. Quest `/public` endpoint reads the JWT (when present) so anonymous and authenticated requests both work.
- [x] **X8.** Admin Dashboard tab switcher (Submissions ↔ Reports) with new `ReportsTab` component. Pending queue (oldest-first for SLA fairness), 24h SLA badge, urgent flag for sexual_minors / violence / illegal categories. Detail panel offers all four resolution actions: Dismiss / Remove content / Suspend user / Ban user, with optional internal notes.
- [x] **X9.** Terms & Conditions (incl. Apple EULA pass-through in Section 15) live at https://urbanquestapp.com/terms-conditions/. Linked from mobile login screen with a required acknowledgement checkbox (`apps/mobile/app/(auth)/login.tsx`). _Outstanding for full UGC compliance: explicit "no objectionable content" clause for the user-generated quest content. Today's terms cover safety/IP but don't yet ban harassment/hate/etc. by users — see X9a._
- [~] **X9a.** Drafted in `docs/terms-conditions.md` Section 8 + Section 9 (full Prohibited Content & Conduct list and 24h moderation/reporting language). **Pending:** Brent updates the live WordPress page at https://urbanquestapp.com/terms-conditions/ from the corrected file.
- [ ] **X10.** Add the same Terms + Privacy acknowledgement checkbox to creator-station signup (`apps/creator-station`). Currently Creator Station logs in with a stored email but has no consent gate.

---

## Automated Moderation Roadmap (post-launch)

Goal: reduce Brent's manual approval load as quest volume grows, without dropping below the Apple/Google bar. Build incrementally — each layer below cuts manual review time without removing the human-in-the-loop until quality is proven.

### Phased rollout

- [ ] **M1. Layer 1 — text moderation (cheapest, deploy first).** Run quest titles, descriptions, scene scripts, and creator bios through **OpenAI Moderation API** (free) at submission time. Auto-flag-for-review if any category score > 0.5; auto-reject if > 0.9. Layer in front of Brent's manual approval, never behind it at launch.
- [ ] **M2. Layer 2 — image moderation.** Run waypoint cover images and scene images through **Google Cloud Vision SafeSearch** or **AWS Rekognition Content Moderation**. Same threshold pattern as M1. (Cost: ~$1.50 per 1k images.)
- [ ] **M3. Layer 3 — audio moderation.** AI-narrated audio (TTS) → moderate the source text upstream of TTS, no separate audio scan needed. Creator-uploaded audio → transcribe with Whisper → run transcription through Moderation API. (Most cost-effective path.)
- [ ] **M4. Layer 4 — creator trust score.** Each creator gets a score (0–100) starting at 50. Clean approvals raise it, reports and rejections lower it. Above 80 = auto-approve text-only changes (still review media). Below 30 = block from publishing pending review. Saves the most reviewer time and is the standard pattern (see Roblox, Twitch UGC).
- [ ] **M5. Layer 5 — duplicate / repost detection.** Hash quest titles and descriptions; flag near-duplicates submitted by different creators (common spam vector).
- [ ] **M6. Layer 6 — geographic / IP abuse signals.** Flag bursts of submissions from the same IP, VPN-detected sources, or sanctioned regions.

### Open questions for the roadmap

- [ ] **Q22.** Which moderation provider stack do we want? Options: **OpenAI Moderation** (free, text only), **Google Cloud Vision SafeSearch** (text + image), **AWS Rekognition** (image + video), **Hive Moderation** (highest accuracy, paid). My recommendation: OpenAI for text + Google Vision for images at v1.1, leave video for v1.2.
- [ ] **Q23.** What are the **auto-reject** vs. **queue-for-review** thresholds? Defaults proposed in M1 (0.5 = queue, 0.9 = reject) but want your ratio-of-false-positives tolerance.
- [ ] **Q24.** Does a creator trust score (M4) make sense for our model, or is every quest reviewed forever? Trust scores accelerate ship cadence but add complexity.
- [ ] **Q25.** Audit-log retention: how long do we keep `Report` records and moderation decisions for legal/compliance? US default is 1–3 years; EU GDPR pushes for shortest necessary. Default proposal: 2 years.
- [ ] **Q26.** Do we want a **transparency report** page (e.g. `/about/moderation`) showing aggregate stats — number of reports, average resolution time, action rate? Some stores look favorably on this; not strictly required.
- [ ] **Q27.** When does Brent stop being the sole moderator? Threshold proposal: when daily report volume exceeds 1/day for 30 consecutive days, hire/contract a moderation queue handler. Document the trigger in this doc when answered.

### Roadmap tasks

- [ ] **M7.** Add `moderationLog` table in Prisma to track every automated decision (entity, decision, score, model version, timestamp). Critical for tuning thresholds and for legal defensibility.
- [ ] **M8.** Add a **moderation provider abstraction** in `apps/api/src/lib/moderation.ts` so we can swap providers without touching feature code.
- [ ] **M9.** Background worker (BullMQ or similar) that runs moderation async on submission, then notifies the admin queue. Don't block creator submission on the moderation API call — too easy to fail open or cause UX hangs.
- [ ] **M10.** Add admin-only **threshold-tuning UI** in creator-station so we can adjust auto-reject vs. queue thresholds without a deploy.

---

## Done

- [x] **Q1** (2026-04-25) — Desktop version = **web-only Creator Station**. No Mac App Store / Microsoft Store packaging. Retires Q6 and the entire Desktop section (D1–D7).
- [x] **Q2** (2026-04-25) — iOS bundle ID = `com.urbanquest.app`. Unblocked **A1** (applied to `apps/mobile/app.json`).
- [x] **Q3** (2026-04-25) — Android `applicationId` = `com.urbanquest.app` (matches iOS, standard practice). Unblocked **G1** (applied to `apps/mobile/app.json`).
- [x] **Q4** (2026-04-26) — Apple Developer Program: active, Organization, **Blue Pelican Digital LLC**. Unblocks signing certs, App Store Connect record creation, TestFlight uploads.
- [x] **Q5** (2026-04-26) — Google Play Console: active, Organization, **Blue Pelican Digital LLC**. Org account skips the 20-tester / 14-day closed-test rule.
- [x] **Q13** (2026-04-26) — Listing company name = **Blue Pelican Digital LLC** (implicit in Q4/Q5).
- [x] **Q8** (2026-04-26) — Monetization = **Freemium**. Puts StoreKit (A6) and Play Billing (G11) on v1 critical path. Specific products tracked in **Q8a**.
- [x] **Q15** (2026-04-26) — UGC audit done by code search. Pre-publish moderation **exists** (admin portal). Report Content, Block User, and EULA **all missing** — added as X4–X9 + A5 on the v1 critical path.
- [x] **Q16** (2026-04-26) — Moderation ownership: **Brent personally at launch** (existing admin portal flow). Automation roadmap added as **M1–M10** + **Q22–Q27** post-launch.
- [x] **Q7** (2026-04-26) — iPad at v1 = no. `supportsTablet` set to `false`. Unblocked **A10**; narrowed **A11** to iPhone-only screenshots.
- [x] **Q20** (2026-04-26) — Background location = no. In-use only. Unblocked **A2** (added iOS string), narrowed **G3**. Spawned new task **A18** to install `expo-location` and wire device GPS into `useLocationStore` (currently stubbed).
- [x] **Q10 / Q11** (2026-04-26) — Privacy Policy + Terms & Conditions live at `urbanquestapp.com/privacy-policy/` and `/terms-conditions/`. Snapshots saved to `docs/policies/`. Mobile login screen now has a required-checkbox + tappable links via `expo-web-browser`. Unblocked **A3**, partial **X9** (EULA pass-through covered; "Prohibited Content & Conduct" clause still owed → **X9a**). Discovered that payments will be handled by **RevenueCat** per the live policies — collapsed **A6 + G11** into one integration. Discovered that creator-station has no consent gate yet → **X10**.
- [x] **Q14** (2026-04-26) — Public support email = `support@urbanquestapp.com` (active). Corrected, paste-ready policy docs prepared in `docs/privacy-policy.md` and `docs/terms-conditions.md` for the WordPress update.
- [x] **Q12** (2026-04-26) — Account deletion: public URL = `urbanquestapp.com/account-deletion/`, page body drafted in `docs/account-deletion.md`. In-app flow split out as **A19** (now the ⭐ next task).
- [→] **Sent to WordPress dev (2026-04-26)** — corrected privacy policy + corrected terms & conditions delivered for publishing. **X9a** unblocks fully once dev pushes the new Sections 8 + 9 to the live page.
- [x] **A19** (2026-04-26) — In-app account deletion implemented: anonymizing transaction in `apps/api`, schema migration adding `deletedAt`, `deleteAccount()` in mobile API client + auth store, confirmation-modal UI in `apps/mobile/app/(tabs)/profile.tsx`. Closes the most-cited rejection cause for apps with account creation.
- [x] **A18** (2026-04-26) — `expo-location` installed and wired. Plugin registered in `app.json` with our purpose string; `useLocationTracking` hook subscribes to `watchPositionAsync` and updates `useLocationStore`; onboarding now calls the real iOS permission API. Resolves the inconsistency between declared privacy claims and actual API calls.
- [x] **Q19 + A15 + X2** (2026-04-26) — Third-party SDK audit clean (no analytics/crash/ads/attribution SDKs). iOS Privacy Manifest (`apps/mobile/ios/urbanquest/PrivacyInfo.xcprivacy`) updated to declare all 11 collected data categories. Master inventory at `docs/privacy-data-inventory.md` is now the single source of truth for Apple App Privacy form, Google Data Safety form, live Privacy Policy, and the manifest — with a maintenance protocol so they stay in sync.
- [x] **Q9** (2026-04-26) — IAP-only on mobile. No parallel web checkout for the same digital goods.
- [x] **Q21** (2026-04-26) — No health/financial/children's data. Policy 13+ is correct; not in Kids Category / Designed-for-Families.
- [x] **A5 + X4–X8** (2026-04-26) — UGC moderation shipped end-to-end. Backend: polymorphic `Report` model, `UserBlock`, `requireAdmin`-protected admin endpoints, blocked-author + banned-user filtering on the quest list. Mobile: `ReportSheet` (9 reason categories) + `ContentMenu` overflow on quest detail with Report and Block actions. Creator-station: AdminDashboard now has a **Reports tab** with oldest-first SLA queue, urgent flagging, and four resolution actions (Dismiss / Remove content / Suspend user / Ban user). Closes the biggest remaining UGC-compliance gap.
- [x] **Q17** (2026-04-26) — Demo seed locations: Apple Park (Cupertino, ~37.3349°N/122.0090°W) for Apple reviewers, Googleplex (Mountain View, ~37.4220°N/122.0841°W) for Google. Used in A11 (screenshots) and A17 (reviewer notes).
- [x] **Q18** (2026-04-26) — Reviewer demo account = `reviewer@urbanquestapp.com`, password to be generated when account is created, pre-loaded with at least one free quest near each demo cluster + at least one purchased premium quest. Used in A17.
- [x] **Q8a** (2026-04-26) — Three-pronged monetization: free quests with ads, creator-priced paid quests, $5.99/mo Premium subscription (removes ads only). Sub-decisions split out as Q8b–Q8h. Significantly expands **A6** scope and adds new ad-related compliance tasks **A20–A25**.
- [x] **Q8b–Q8h** (2026-04-26) — All monetization sub-decisions approved at recommended defaults: curated tier list (Free/$0.99/$1.99/$2.99/$4.99/$9.99), AdMob, max 1 interstitial per 2 scenes / 60s minimum, 70/30 creator-platform split on paid quests, 100% platform on ad revenue at launch, Stripe Connect Express for payouts (web-only), `com.urbanquest.app.premium.monthly` for the $5.99 sub with no free trial at launch. **A6** is fully unblocked.
- [x] **A6 + G11 + A20 + A22 + A24 + A25** (2026-04-26) — Full monetization stack shipped across 4 chunks: RevenueCat Premium subscription + paywall, per-quest IAP wired through curated tier picker, AdMob interstitials with frequency cap + Premium gate, ATT prompt, UMP GDPR consent, iOS Privacy Manifest updated for tracking, data inventory updated, Stripe Connect Express creator payouts. Real keys/IDs (RevenueCat API keys, AdMob app IDs, Stripe secret) are read from EXPO_PUBLIC_* / STRIPE_SECRET_KEY env vars at build time — code paths run in dev with placeholders / test IDs.
- [x] **Editor persistence bugs** (2026-04-27) — Two bugs causing creator edits to silently disappear. **Bug 1:** Fastify default `bodyLimit` of 1 MiB rejected cover-image data URIs; the store's `updateQuest` catch block updated local state anyway, masking the failure. Fixed by bumping `bodyLimit` to 10 MiB; proper multipart fix tracked as **A26**. **Bug 2:** `updateScene` in `apps/creator-station/src/store/useWriterStore.js` only updated local Zustand state — never called `api.updateScene`. Every keystroke into script / question / choices / waypointId was lost on refresh. Fixed by adding a 500ms-debounced server save, JSON-stringifying choices, skipping local-only scene IDs, and adding a `sceneSaveState` map. Surfaced as a "Saving… / Saved" indicator in the scene-editor header (`CreateTab.jsx`).
- [x] **vite-plugin-checker + eslint-plugin-react** (2026-04-27) — Wired ESLint into the creator-station dev server so missing-import bugs (the class that caused the `ImageIcon` and `CircleCheckBig` blank-screen incidents) now surface as a Vite overlay at save time instead of as a runtime blank screen. Added `eslint-plugin-react` so JSX usage of variables (`<Icon />`) is recognized — fixes the `react/jsx-no-undef` rule and eliminates `no-unused-vars` false positives on JSX-only imports. Also fixed two real bugs the upgraded lint surfaced: `useRef`/`useState` after a conditional return in `QuestSettings.jsx`, and a self-referential `useCallback` recursion in `useNotifications.js`.
- [x] **AI Narrate redesign** (2026-04-27) — Full feature rebuild per Brent's spec: narrator selection moved from Quest Info into the AI Narrate modal; voice picker dynamically populates from Chatterbox `GET /v1/voices` (so uploads light up the picker without code changes); per-voice preview button hits Chatterbox `GET /v1/voices/{name}/download` directly (Chatterbox CORS defaults to `*`); single-request "Generate Full Narration" lets Chatterbox handle internal text chunking and returns one audio file; "Attach to scene" wraps the result as a real `File` so the existing media-upload flow accepts it; voice-tuning sliders hidden behind an "Advanced" disclosure (Q7b). Added per-scene `narratorVoiceId` field to Prisma; modal stamps both scene and quest so the next scene pre-selects the same voice (Q1c hybrid scope). Rewrote `apps/creator-station/src/services/ttsService.js` (single-blob output, dynamic voice list, preview URL). Removed dead `apps/creator-station/src/pages/write/AudioStudio.jsx` (1000+ unused lines that referenced the removed TTS API). NARRATOR_VOICES catalog re-keyed to lowercase short IDs (`marcus`, `elena`, …) that match expected Chatterbox upload names. Open follow-ups: **A27** (production TTS hosting), **A28** (WAV→Opus conversion), **C1** (LibriVox sourcing).

---

## How to use this doc

1. **Always work the "Next Recommended Task" item first.** It is the smallest unblock that unblocks the most downstream work.
2. When a question is answered, paste the answer below the question, mark `[x]`, and move the entry to **Done** with a timestamp.
3. When a compliance task is completed, link the commit/PR that did it, mark `[x]`, and move the entry to **Done**.
4. After moving an item, **update the "Next Recommended Task" header** to whatever now has the highest leverage (typically: another open question if one exists, otherwise the highest-priority compliance task whose dependencies are all answered).
