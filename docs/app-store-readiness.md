# App Store Submission Readiness — Urban Quest (iOS)

Source: "The Real Reason Vibe Coded Apps Keep Failing the App Store Review" — @damidefi (https://x.com/damidefi/status/2047612989201600948)

This doc is the running checklist for getting `apps/mobile` (Expo / React Native) approved on first submission. It captures every task from the source article so we can tick items off and record decisions/blockers as we go.

**Legend:** `[ ]` not started · `[~]` in progress · `[x]` done · `[N/A]` not applicable (with reason)

---

## 0. Apple's "minimum utility" rule (cannot be fixed after submission)

Apple rejects apps that are too thin, single-screen, or a wrapper around a website. If our one core thing isn't genuinely useful and not replicable in a browser, no amount of submission hygiene saves us.

- [ ] Confirm Urban Quest's core value prop is native-only (location, maps, audio narration, AR/camera waypoints) and document it in the reviewer notes.
- [ ] Make sure the demo flow a reviewer sees within 30 seconds shows that native value (e.g. lands them inside an active quest near a real-world waypoint with audio playing — not on an empty dashboard).

---

## 1. Privacy

- [ ] **Privacy nutrition labels** — declare every data type collected, the purpose, and whether it's linked to user identity. Cross-reference against every API call in `apps/mobile` and every column in `apps/api` Prisma schema. When in doubt, declare more.
  - Likely items to declare: email/name (account), device location (gameplay), photos/audio (waypoint media), usage analytics (if any), crash logs (if any).
- [ ] **Privacy policy hosted at a live, public URL.** Open it in a private browser window before submitting.
- [ ] **Privacy Policy URL** field in App Store Connect populated and verified.
- [ ] iOS `Info.plist` usage descriptions accurate and human-readable. Currently set in `apps/mobile/app.json`:
  - `NSCameraUsageDescription`
  - `NSMicrophoneUsageDescription`
  - `NSPhotoLibraryUsageDescription`
  - **Missing:** location strings (`NSLocationWhenInUseUsageDescription`, and `NSLocationAlwaysAndWhenInUseUsageDescription` if we use background location). The app uses location — these must be added or we fail review.

## 2. Metadata accuracy

- [ ] App **name**, **subtitle**, **description**, and **screenshots** match exactly what a first-time user sees on launch. No placeholder text. No features shown that don't exist in the build being submitted.
- [ ] Screenshots taken from a **fresh simulator with no pre-existing data** (no test accounts, no debug overlays, no dev-only buttons).
- [ ] No paid features visible in screenshots without disclosure.
- [ ] First three lines of the description carry the hook (that's all users see before "more").
- [ ] Keyword field (100 chars) used efficiently — no words duplicated from title/subtitle.

## 3. Payments / StoreKit

- [ ] Any digital goods or subscriptions go through **StoreKit / Apple IAP**. Apple takes 15–30%.
- [ ] **No external payment links** for digital products anywhere in the app (no Stripe links, no web checkout for digital content).
- [ ] Audit current code: confirm whether Urban Quest sells anything inside the app today, and if so what (quest unlocks, narrator voices, creator tips, etc.). Map each to either StoreKit or "physical/real-world good" (which is allowed outside IAP).

## 4. Age rating

- [ ] Complete the **age rating questionnaire** in App Store Connect.
- [ ] Answer based on what the app **could** display, not just what it currently shows.
- [ ] If the app supports user-generated content (creators publishing quests, scenes, narration) or unrestricted web access — **declare it**. UGC almost certainly applies here because creator-station publishes to mobile.
- [ ] If UGC is declared, ensure we have:
  - [ ] A way for users to **report objectionable content** in-app.
  - [ ] A way for users to **block other users** in-app.
  - [ ] A method for filtering/moderating UGC and acting on reports within 24 hours (Guideline 1.2).

## 5. Design / Human Interface Guidelines

- [ ] All tap targets meet the **44pt minimum**.
- [ ] Tested on the **oldest supported device** in the deployment target range, not just the latest simulator.
- [ ] **Safe-area insets** respected — nothing clips under the home indicator or notch.
- [ ] **Dynamic Type** supported (text scales with the system text-size setting).
- [ ] iPad layout works (`app.json` currently sets `supportsTablet: true`, so we owe Apple a working iPad experience and iPad screenshots, OR we flip this to `false`).

## 6. Stability

- [ ] **Crash-free on all supported devices** in the deployment target range, not just the developer's device.
- [ ] App does not crash on launch on any target device.
- [ ] App tested **cold on a fresh simulator** (no cached state, no logged-in user).

## 7. Submission packaging

- [ ] **Bundle identifier** set to a real value (currently `com.anonymous.urban-quest` in `apps/mobile/app.json` — must change to a real reverse-DNS that matches the App Store Connect record, e.g. `com.urbanquest.app`).
- [ ] App record created in App Store Connect with matching bundle ID and SKU.
- [ ] Primary + secondary App Store category chosen deliberately (5 minutes of thought, not the first option).
- [ ] Pricing tier and territory availability set.
- [ ] Build archived in Xcode and uploaded; selected as the submission build in App Store Connect.
- [ ] Screenshots uploaded for **every required device size** — minimum iPhone 6.5" and 5.5" displays, plus iPad sizes since `supportsTablet: true`.

## 8. Reviewer notes (the most-skipped step)

- [ ] **Demo account credentials** (email + password) added to the reviewer notes field. The reviewer cannot create an account, so without this, login-gated apps are auto-rejected.
- [ ] Demo account has the **paywall unlocked** (if any), onboarding completed, and lands directly in the core experience.
- [ ] Reviewer notes explain anything non-obvious — e.g. "this app uses location to detect proximity to real-world waypoints; we recommend testing in San Francisco coordinates seeded under the demo account."
- [ ] If we use background location, the notes explain why.

## 9. TestFlight pre-flight

- [ ] Build distributed through **TestFlight** before App Store review.
- [ ] Installed and tested on **at least two physical iOS devices** (not just the simulator).
- [ ] Every core user flow exercised from a fresh install.
- [ ] Crashes, layout issues, and broken empty states caught and fixed before review.

## 10. Submit-day checklist (run end-to-end the day of submission)

- [ ] Privacy labels saved.
- [ ] Privacy policy URL loads in a private browser window.
- [ ] Description matches what a first-time user sees.
- [ ] Screenshots are from a clean simulator.
- [ ] StoreKit covers all digital goods; no external links for digital products.
- [ ] Age rating questionnaire answered for max-possible content.
- [ ] All tap targets ≥ 44pt; tested on oldest supported device; nothing clips.
- [ ] Demo credentials in reviewer notes; demo account fully unlocked.
- [ ] TestFlight build passes on two physical devices.
- [ ] App does not crash cold on a fresh simulator.

---

## If we get rejected

1. **Read the rejection notice fully.** Apple cites a specific guideline number — look it up in the App Store Review Guidelines and understand exactly what was flagged before changing anything.
2. **Fix only what was flagged.** Don't bundle unrelated changes — reviewers re-flag new issues on resubmission. One targeted fix per cycle.
3. **Use the Resolution Center** inside App Store Connect if the rejection is unclear. Ask the reviewer for clarification — they do respond, and one message can save a whole resubmission cycle.

---

## Open questions / decisions to make

- [ ] Final **bundle ID** (replacing `com.anonymous.urban-quest`).
- [ ] Real **Apple Developer Program** account in place (annual fee paid)? Whose name on the listing?
- [ ] Do we want iPad support at launch, or set `supportsTablet: false` to skip iPad screenshots and iPad QA?
- [ ] **Monetization model at launch** — free, paid, IAP, subscription? Determines whether StoreKit work is needed pre-launch.
- [ ] Where will the privacy policy be hosted? Marketing site? A simple GitHub Pages page?
- [ ] Demo coordinates / seed data for the reviewer — which city should the seeded quests live in?
