# Questions Left — Urban Quest Store-Compliance Tracker

Running list of decisions and tasks needed to get **Urban Quest** (mobile + desktop) fully compliant for the **Apple App Store** and **Google Play Store**. As items are answered/completed, mark them `[x]` and move them to the bottom.

Companion doc: [`app-store-readiness.md`](./app-store-readiness.md) — the deeper App Store requirements checklist sourced from the @damidefi guide.

---

## ⭐ Next Recommended Task

> **Q4 — Apple Developer Program account.** $99/yr; takes ~24–48h to activate (longer for organization accounts that need a D-U-N-S number). Without it we can't create the App Store Connect record, generate signing certs, or upload a TestFlight build. **Two sub-questions:** (a) is there already an active account, and (b) individual or organization, and under what name? Q5 (Google Play Console — $25 one-time) is the parallel question for Android and can be answered at the same time.

---

## Open Questions — answer these to unblock work

### Identity & Accounts
- [x] **Q2.** iOS bundle ID = **`com.urbanquest.app`** (answered 2026-04-25). Applied to `apps/mobile/app.json`.
- [x] **Q3.** Android `applicationId` = **`com.urbanquest.app`** (matches iOS — answered 2026-04-25). Applied to `apps/mobile/app.json`.
- [ ] **Q4.** **Apple Developer Program** account — active? Individual or organization? Whose name on the listing?
- [ ] **Q5.** **Google Play Console** account — active? ($25 one-time fee, plus the new "20-tester / 14-day closed test" requirement for new personal developer accounts.)
- [N/A] **Q6.** Mac Developer ID / Microsoft Partner Center — **not needed** since Creator Station ships web-only (Q1 = a).

### Product & Monetization
- [ ] **Q7.** Should iPad be supported at v1 launch, or set `supportsTablet: false` to skip iPad screenshots and iPad QA?
- [ ] **Q8.** **Monetization model at launch** — free, paid up-front, IAP (per quest, per narrator voice), subscription (creator tier), or freemium? This determines whether StoreKit / Google Play Billing are on the v1 critical path.
- [ ] **Q9.** If we sell digital goods on mobile, will we also offer those goods on the website? If yes, the in-app prices must comply with Apple's "anti-steering" rules (no link from the app to a cheaper web checkout).

### Legal & Hosting
- [ ] **Q10.** Where will the **Privacy Policy** be hosted? (Marketing site, GitHub Pages, Notion-public, etc.) Required for both stores; URL must load in a private browser.
- [ ] **Q11.** Where will the **Terms of Service / EULA** be hosted? (Required for Google Play if collecting personal data; recommended for Apple.)
- [ ] **Q12.** Where will the **Account Deletion** flow be hosted? (Required by both stores since 2024 — must be in-app **and** at a public URL.)
- [ ] **Q13.** Company / business name to put on App Store Connect and Google Play Console listings.
- [ ] **Q14.** Support email address shown publicly on both store listings.

### UGC & Moderation
- [ ] **Q15.** Creator Station publishes quests that mobile users consume — this is **UGC**. Apple Guideline 1.2 + Google Play UGC policy require: in-app **report content**, in-app **block user**, **moderation within 24h**, and an **EULA** that prohibits objectionable content. Do these exist anywhere today? If not, building them is on the v1 critical path.
- [ ] **Q16.** Who handles the 24-hour moderation queue? (You, a small ops team, or automated + escalation?)

### Reviewer Logistics
- [ ] **Q17.** Geographic location for **demo seed data** so reviewers can experience the location-based quests without traveling. Safest answer: a tight cluster of waypoints near **One Apple Park Way, Cupertino** for Apple, and a separate cluster near Google's Mountain View campus for Google Play.
- [ ] **Q18.** Demo account email and password for both stores (will live in the reviewer notes field).

### Tech & Compliance
- [ ] **Q19.** Are we using any **third-party SDKs** that collect data (analytics, crash reporting, ads, push)? Each must be declared in App Privacy and Google Data Safety, and Apple now requires SDKs on the "Privacy Manifest" list to ship a manifest.
- [ ] **Q20.** Do we use **background location**? (Different `Info.plist` strings + a much higher review bar on both stores.)
- [ ] **Q21.** Do we collect **health, financial, or children's data**? (Triggers extra forms and SDK restrictions on both stores.)

---

## Compliance Tasks — work to do once questions above land

### Apple App Store (`apps/mobile` iOS build)
- [x] **A1.** Replaced bundle ID in `apps/mobile/app.json` with `com.urbanquest.app` (2026-04-25).
- [ ] **A2.** Add missing iOS usage strings to `apps/mobile/app.json`:
  - `NSLocationWhenInUseUsageDescription` (the app uses location — without this it auto-rejects)
  - `NSLocationAlwaysAndWhenInUseUsageDescription` (only if Q20 = yes)
- [ ] **A3.** Build and host the **Privacy Policy** page (waiting on Q10).
- [ ] **A4.** Build the **in-app account-deletion flow** + companion public URL (waiting on Q12).
- [ ] **A5.** Implement **Report Content** + **Block User** in mobile + a moderation backend in `apps/api` (waiting on Q15/Q16).
- [ ] **A6.** Move any digital-goods purchase flows to **StoreKit** (waiting on Q8).
- [ ] **A7.** Audit minimum tap targets ≥ 44pt across `apps/mobile`.
- [ ] **A8.** Verify Dynamic Type support across the app.
- [ ] **A9.** Verify safe-area insets on notched + Dynamic-Island devices.
- [ ] **A10.** Decide iPad support (Q7); if no, set `supportsTablet: false`; if yes, build iPad layouts and capture iPad screenshots.
- [ ] **A11.** Capture iPhone 6.5" + 5.5" screenshots from a clean simulator with seed data (waiting on Q17).
- [ ] **A12.** Write the App Store description (first 3 lines = the hook), subtitle, keywords (100 chars).
- [ ] **A13.** Complete the **App Privacy** nutrition labels in App Store Connect (waiting on Q19).
- [ ] **A14.** Complete the **Age Rating** questionnaire — answer for max-possible UGC content, not just current.
- [ ] **A15.** Generate **Privacy Manifest** (`PrivacyInfo.xcprivacy`) per Apple's 2024 requirement; verify all third-party SDKs included one.
- [ ] **A16.** Run a TestFlight build on **two physical iOS devices** end-to-end before submission.
- [ ] **A17.** Fill reviewer notes with demo credentials, demo coordinates, and any non-obvious flow notes (waiting on Q17/Q18).

### Google Play Store (`apps/mobile` Android build)
- [x] **G1.** Set Android `applicationId` to `com.urbanquest.app` in `apps/mobile/app.json` (2026-04-25).
- [ ] **G2.** Verify **target API level** meets Google's current minimum (currently API 35 / Android 15 for new submissions in 2026).
- [ ] **G3.** Add the equivalent Android runtime permission rationales for camera, microphone, photos, **fine + coarse location**, and (if Q20 = yes) `ACCESS_BACKGROUND_LOCATION` — note: background location requires a Play Console form justifying the use case.
- [ ] **G4.** Build a signed **Android App Bundle (.aab)** (Play Store requires `.aab`, not `.apk`).
- [ ] **G5.** Complete the **Data Safety** form in Play Console (parallels Apple's privacy labels but separate).
- [ ] **G6.** Complete the **Content Rating** questionnaire (IARC) — declare UGC if applicable (Q15).
- [ ] **G7.** Configure **Account Deletion** in Play Console pointing to the public URL from A4.
- [ ] **G8.** Run an **internal testing track** → **closed testing track** (Google's new policy requires 20 testers for 14 days for personal accounts before production).
- [ ] **G9.** Capture Android phone + 7"/10" tablet screenshots from a clean emulator with seed data.
- [ ] **G10.** Write Play Store short description (80 chars) + full description (4000 chars) + feature graphic + app icon (512×512).
- [ ] **G11.** If using Google Play Billing, integrate the library; same anti-steering rules now relaxed in some markets but still strict in most.

### Desktop / Mac App Store
**N/A — Creator Station ships web-only per Q1 (answered 2026-04-25).** D1–D7 retired. Cross-cutting items (X1–X3) still apply to the web app for SEO/legal hygiene.

### Cross-cutting (mobile + desktop)
- [ ] **X1.** Single source of truth for: privacy policy, terms, account deletion, support email, company name. Reuse on every store listing.
- [ ] **X2.** Centralize the data-collection inventory in one spot so Apple Privacy Labels, Google Data Safety, and the Privacy Policy all stay in sync.
- [ ] **X3.** Decide on a release versioning convention shared across platforms (`1.0.0` everywhere is fine to start).

---

## Done

- [x] **Q1** (2026-04-25) — Desktop version = **web-only Creator Station**. No Mac App Store / Microsoft Store packaging. Retires Q6 and the entire Desktop section (D1–D7).
- [x] **Q2** (2026-04-25) — iOS bundle ID = `com.urbanquest.app`. Unblocked **A1** (applied to `apps/mobile/app.json`).
- [x] **Q3** (2026-04-25) — Android `applicationId` = `com.urbanquest.app` (matches iOS, standard practice). Unblocked **G1** (applied to `apps/mobile/app.json`).

---

## How to use this doc

1. **Always work the "Next Recommended Task" item first.** It is the smallest unblock that unblocks the most downstream work.
2. When a question is answered, paste the answer below the question, mark `[x]`, and move the entry to **Done** with a timestamp.
3. When a compliance task is completed, link the commit/PR that did it, mark `[x]`, and move the entry to **Done**.
4. After moving an item, **update the "Next Recommended Task" header** to whatever now has the highest leverage (typically: another open question if one exists, otherwise the highest-priority compliance task whose dependencies are all answered).
