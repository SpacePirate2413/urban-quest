# Privacy Data Inventory — Urban Quest

> **Purpose:** Single source of truth for what Urban Quest collects, what it does with that data, and how each item is declared on every required surface (live Privacy Policy, Apple App Store Connect, Google Play Console, iOS Privacy Manifest). When any one of these is updated, ALL of them must be updated to match. Apple and Google reject apps where these declarations conflict.
>
> **Last audited:** 2026-04-26 (during Q19 — Third-party SDK audit).

---

## Q19 Audit Summary — Third-Party Data Collectors

A grep of `apps/mobile`, `apps/api`, and `apps/creator-station` for the standard catalog of analytics, crash reporting, advertising, attribution, and tracking SDKs returned **zero hits**. The codebase is unusually clean for compliance purposes — there is nothing to declare beyond what we collect and store ourselves.

### What's installed today

| Package | Category | Collects data? | Declared in policy? |
|---|---|---|---|
| `expo-router`, `expo-haptics`, `expo-symbols`, `expo-status-bar`, `expo-system-ui`, `expo-font`, `expo-constants`, `expo-splash-screen`, `expo-web-browser`, `expo-blur`, `expo-linking`, `react-navigation/*`, `@expo/vector-icons` | UI / navigation | No | N/A |
| `expo-av`, `expo-image`, `expo-image-picker` | Media access (microphone, camera, photos) | Accesses; we store | Yes — Section 1.c (Media), Section 1.d (UGC) |
| `expo-location` | Precise GPS | Accesses; we store | Yes — Section 1.b |
| `@react-native-async-storage/async-storage` | Local storage | No transmission | N/A |
| `zustand` | State (in-memory) | No | N/A |
| Apple Sign In (planned) | Auth | We receive Apple ID + email | Yes — Section 1.a + Section 4 |
| Google Sign In (planned) | Auth | We receive Google ID + email | Yes — Section 1.a + Section 4 |

### What the policy promises but isn't installed yet (gaps to track)

| Service | Promise location | Status | Action |
|---|---|---|---|
| **RevenueCat** | Privacy Policy §3 + Terms §5 | **Installed** (2026-04-26) via `react-native-purchases`. SDK manages purchase state but does not collect personal data beyond the AppUserId we pass. No additional inventory entry required. | — |
| **Google AdMob** | _Privacy Policy will need an update_ — currently silent on ads, but SDK is now installed. **A21** still pending. | **Installed** (2026-04-26) via `react-native-google-mobile-ads`. Frequency-capped interstitials, Premium subscribers see no ads. Tracking declared in PrivacyInfo.xcprivacy. | A21 — update Privacy Policy on WordPress to disclose AdMob, IDFA, and ad-targeting opt-out link. |

### What we *do not* have, *do not* claim, and could add later

| Capability | Status | Notes |
|---|---|---|
| Crash reporting (e.g., Sentry, Crashlytics) | Not installed | Strongly recommended for v1.x. The Privacy Policy §1.c already mentions "crash logs and performance diagnostics" so adding a crash SDK doesn't require a policy change, but it does require a Privacy Manifest update. |
| Analytics (Mixpanel/PostHog/Amplitude/Firebase Analytics) | Not installed | Out of scope for v1. If added, would require a new collected-data category and additional policy disclosure. |
| Push notifications | Not installed | Add when scope demands; iOS push needs `UNUserNotificationCenter` and a permission string. |
| Ads / AdMob / Facebook Ads | Not installed and not planned | Adding ads opens up the IDFA/AppTrackingTransparency surface and significantly raises the review bar. |
| Attribution (AppsFlyer/Adjust/Branch) | Not installed | Same as ads — would flip `NSPrivacyTracking` to `true` in the manifest. |

---

## Master Data-Type Inventory

Every row below must have a **YES** in every column that applies. If a row is added/changed, update the live Privacy Policy, the iOS Privacy Manifest, the App Store Connect privacy form, and the Google Play Data Safety form.

| Data type | What we collect | Why | Linked to user? | Used for tracking? | iOS Privacy Manifest type | App Store Privacy category | Google Play Data Safety category |
|---|---|---|---|---|---|---|---|
| **Email address** | The email associated with your Apple/Google sign-in | Account identity, support communication | Yes | No | `NSPrivacyCollectedDataTypeEmailAddress` | Contact Info → Email Address | Personal info → Email address |
| **Name / display name** | Your Apple/Google name; optional custom username | Display in profile, attribution on Creator quests | Yes | No | `NSPrivacyCollectedDataTypeName` | Contact Info → Name | Personal info → Name |
| **User ID** | Stable internal account ID (CUID); links to Apple/Google ID | Persist your account across sessions | Yes | No | `NSPrivacyCollectedDataTypeUserID` | Identifiers → User ID | App activity → Account |
| **Precise location** | Latitude/longitude while the app is in use | Detect arrival at quest waypoints; anchor scouted waypoints | Yes | No | `NSPrivacyCollectedDataTypePreciseLocation` | Location → Precise Location | Location → Approximate location *and* Precise location |
| **Photos and videos** | Media you upload via scouted waypoints or scene authoring | Display your media in quests / reviews | Yes | No | `NSPrivacyCollectedDataTypePhotosorVideos` | User Content → Photos or Videos | Photos and videos |
| **Audio recordings** | Audio you upload via scouted waypoints or narration uploads | Quest narration playback | Yes | No | `NSPrivacyCollectedDataTypeAudioData` | User Content → Audio Data | Audio files → Voice or sound recordings |
| **Other user content** | Quest titles, descriptions, scripts, scenes, reviews | The actual content you publish | Yes | No | `NSPrivacyCollectedDataTypeOtherUserContent` | User Content → Other User Content | Personal info → Other info |
| **Product interaction** | Story progress, quest completions, scenes viewed | Track progress; basic analytics for App stability | Yes | No | `NSPrivacyCollectedDataTypeProductInteraction` | Usage Data → Product Interaction | App activity → App interactions |
| **Crash data** | iOS / Android automatic crash logs | Improve stability | No | No | `NSPrivacyCollectedDataTypeCrashData` | Diagnostics → Crash Data | App info and performance → Crash logs |
| **Performance data** | Frame rates, load times, error rates | Improve stability | No | No | `NSPrivacyCollectedDataTypePerformanceData` | Diagnostics → Performance Data | App info and performance → Diagnostics |
| **Other diagnostic data** | Device type, OS version, debug flags | Reproduce bugs across devices | No | No | `NSPrivacyCollectedDataTypeOtherDiagnosticData` | Diagnostics → Other Diagnostic Data | App info and performance → Other app performance data |
| **Device ID (IDFA / AAID)** | Apple Advertising Identifier on iOS / Google Advertising ID on Android, when user grants ATT consent | Personalized ads via AdMob in free quests only | Yes | **Yes (Tracking)** | `NSPrivacyCollectedDataTypeDeviceID` | Identifiers → Device ID | App info and performance → Diagnostics → Other |
| **Advertising data** | AdMob ad-event metadata (impressions, click events) | Reporting to AdMob, ad-revenue accounting | Yes | **Yes (Tracking)** | `NSPrivacyCollectedDataTypeAdvertisingData` | Usage Data → Advertising Data | _(declare via Data Safety advertising section)_ |

**Tracking declaration (updated 2026-04-26):** `NSPrivacyTracking = true` because AdMob requests IDFA when the user grants ATT consent. Tracking domains declared in `PrivacyInfo.xcprivacy`: `googleads.g.doubleclick.net`, `pagead2.googlesyndication.com`, `googleadservices.com`, `googlesyndication.com`, `app-measurement.com`. We do not share data with data brokers; ad targeting is for ads served inside the app only.

---

## App Store Connect "App Privacy" form — answers to copy in

When you fill out the **App Privacy** form in App Store Connect, paste these answers item by item. They mirror the master inventory exactly.

For each data type below, the form asks four questions:

1. **Is the data linked to the user's identity?**
2. **Is the data used to track the user?**
3. **Why is the data collected?** (multi-select)
4. **What's an example of how it's used?**

### Contact Info

- **Email Address** — Linked: Yes — Tracking: No — Purposes: App Functionality
- **Name** — Linked: Yes — Tracking: No — Purposes: App Functionality

### Identifiers

- **User ID** — Linked: Yes — Tracking: No — Purposes: App Functionality

### Location

- **Precise Location** — Linked: Yes — Tracking: No — Purposes: App Functionality
- **Coarse Location** — *Not collected.*

### User Content

- **Photos or Videos** — Linked: Yes — Tracking: No — Purposes: App Functionality
- **Audio Data** — Linked: Yes — Tracking: No — Purposes: App Functionality
- **Other User Content** — Linked: Yes — Tracking: No — Purposes: App Functionality

### Usage Data

- **Product Interaction** — Linked: Yes — Tracking: No — Purposes: Analytics, App Functionality

### Diagnostics

- **Crash Data** — Linked: No — Tracking: No — Purposes: App Functionality
- **Performance Data** — Linked: No — Tracking: No — Purposes: App Functionality
- **Other Diagnostic Data** — Linked: No — Tracking: No — Purposes: App Functionality

### Categories explicitly NOT collected

These should be answered **"No"** in the App Privacy form:

- Financial Info (we don't see card numbers — RevenueCat / Apple / Google handle them)
- Health & Fitness
- Sensitive Info
- Browsing History
- Search History
- Contacts
- Customer Support (we *do* receive support emails but App Store Connect treats those as out of scope for the form unless we operate a customer-support widget)
- Other Data Types

---

## Google Play "Data Safety" form — answers to copy in

The Data Safety form structure is similar but uses Google's category names. Fill in:

- **Personal info → Email address, Name, Other info** — Collected, Required, Shared with no third parties (Apple, Google, RevenueCat are auth/payment providers covered separately), Encrypted in transit, User can request deletion.
- **Location → Precise location** — Collected, Required, Shared with no third parties, Encrypted in transit, User can request deletion.
- **Photos and videos** — Collected, Optional (only if the user uploads), Shared with no third parties, Encrypted in transit.
- **Audio files → Voice or sound recordings** — Collected, Optional, Shared with no third parties, Encrypted in transit.
- **App activity → App interactions, In-app search history** — Collected, Required, Encrypted in transit.
- **App info and performance → Crash logs, Diagnostics, Other app performance data** — Collected, Optional (sent automatically by OS), Encrypted in transit.

In **Security practices**:

- **Data is encrypted in transit:** Yes (HTTPS).
- **Users can request that their data be deleted:** Yes — link to the public Account Deletion page (`/account-deletion/`).
- **Has the developer committed to follow the Play Families Policy?** No (app is not directed at children).
- **Has the app been independently validated against a global security standard?** No.

---

## Maintenance protocol

When **any** of the following happen, update this doc first, then propagate:

1. Adding or removing an SDK that collects/transmits data.
2. Changing what fields a user can submit (new content type, new profile field).
3. Adding analytics or crash reporting.
4. Releasing the RevenueCat integration (A6) — adds a new declared service.
5. Hosting or moving any user data to a new sub-processor.

After updating, propagate to:
- `apps/mobile/ios/urbanquest/PrivacyInfo.xcprivacy`
- The live Privacy Policy at `urbanquestapp.com/privacy-policy/` (and the corrected version in `docs/privacy-policy.md`)
- Apple App Store Connect → App Privacy form
- Google Play Console → Data safety form
