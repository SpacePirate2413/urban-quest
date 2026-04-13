# Urban Quest Mobile App — Design Document

**Version:** 1.0  
**Date:** April 13, 2026  
**Platform:** iOS & Android (React Native / Expo)

---

## Overview

Urban Quest is a location-based storytelling game where players purchase and play interactive quests created by content creators. The mobile app serves as the primary player experience, featuring quest discovery, purchase, and gameplay.

**Design Theme:** Comic book aesthetic matching Creator Station and Admin Portal.

---

## App Structure

### Bottom Navigation Tabs

| Tab | Purpose |
|-----|---------|
| **Play** | Quest discovery (map/list), purchase, and gameplay |
| **Write** | Waypoint scouting tool for creators |

---

## Authentication & Onboarding

### Login Requirements
- **Login required** before accessing any app content
- **Supported providers:** Apple Sign-In, Google Sign-In
- **Age collection:** Birthdate required at signup (filters age-inappropriate content)

### Account Creation Flow
1. User taps "Sign in with Apple" or "Sign in with Google"
2. OAuth flow completes
3. If new user → collect:
   - Birthdate (for age-gating)
   - Username (unique, 3-20 characters, profanity filtered)
   - Avatar (optional, can skip)
4. Location permission prompt with message:
   > "Urban Quest is a location-based game and requires location services to play. Please enable location access to continue."
5. Notification permission prompt
6. Redirect to Play tab (map view)

### Username Rules
- Globally unique
- 3-20 characters
- Alphanumeric + underscores only
- Profanity filter applied (AI-based)

---

## Play Tab — Quest Discovery

### Default View
- **Map view** centered on user's current location
- Toggle between **Map** and **List** views

### Map View
- Quest pins show **first waypoint location** only
- Tapping a pin shows a **preview card** with:
  - Cover image
  - Title & tagline
  - Price (or "Free with Ads" tag)
  - Star rating (5-star scale)
  - Creator username (tappable → creator profile)
  - Difficulty: "Creator: Moderate | Players: 4.2/5"
- Tapping the card → Quest Detail Page

### List View
- Card-based layout (similar to Creator Station quest cards)
- Same info as map preview cards
- Sorted by distance from current location (default)

### Search & Filters
- **Search bar:** Type any location/city to search other areas
- **Filter options:**
  - Price range (Free, $0.99-$4.99, $5-$9.99, $10+)
  - Difficulty (Easy, Moderate, Difficult)
  - Duration/estimated time
  - Category/genre
  - Player count (Solo, 2-4 players, 5+ players)
  - Rating (minimum stars)
  - Distance from current location
  - Age rating (4+, 9+, 12+, 17+) — auto-filtered by user's age

### Quest Visibility
- Only **approved** quests appear in the store
- Age-inappropriate quests hidden based on user's birthdate

---

## Quest Detail Page

### Content Displayed
- Cover image (full-width hero)
- Title & tagline
- Description
- Price (or "Free with Ads" tag)
- **Preview:** Auto-generated 10-second clip of first scene audio/video
- First waypoint location on mini-map
- Estimated walking distance (total quest)
- Estimated duration
- Difficulty: "Creator: Moderate | Players: 4.2/5"
- Player count
- Age rating
- Category/genre
- Creator profile link (avatar, username, quest count)
- **Reviews section:**
  - Overall star rating
  - Review count
  - Individual reviews (username, stars, text, date)

### Purchase Button
- "Buy for $X.XX" or "Play Free (with Ads)"
- Tapping → Checkout flow

---

## Checkout & Payment

### Payment Methods
- Credit/debit card (via Stripe)
- Apple Pay (iOS)
- Google Pay (Android)

### Checkout Flow
1. User taps purchase button
2. Payment sheet appears (Stripe Payment Sheet)
3. User selects/enters payment method
4. Confirmation screen: "You now have 30 days to complete this quest!"
5. Redirect to Quest Playback

### Pricing Rules
- **Minimum price:** $0.99 (or free)
- **Currency:** USD only
- **Revenue split:** Creator receives 33%
- **Free quests:** Display "Free with Ads" tag; video ads play after each scene

### Quest Access
- **Duration:** 1 month (30 days) from purchase
- **Expiration warning:** Push notification 3 days before expiration
- **Grace period:** If mid-quest when access expires, 2-day grace period to finish (with notification explaining this)
- **Re-purchase:** Full price (no replay discount)

---

## Quest Playback

### Starting a Quest
1. After purchase, show first waypoint on map
2. Message: "Proceed to your first stop to begin your quest!"
3. Show in-app route line to waypoint
4. Button: "Open in Maps" → Apple Maps (iOS) or Google Maps (Android)

### Navigation Mode
- **Under 0.5 miles:** Default to walking directions
- **Over 0.5 miles:** Default to driving directions
- User can toggle between modes

### Waypoint Arrival
- **Proximity radius:** 15 meters (fixed)
- **Arrival detection:** GPS check while app is open
- **Arrival sound:** Dramatic comic-book quest chime
- **Notification:** "You've arrived! Tap to play the scene."

### Scene Playback
- Full-screen audio or video player
- Scene media plays (uploaded by creator)
- After scene ends → Questions appear

### Questions & Choices
- Display question text
- Show answer choices as tappable buttons
- **Back button:** User can go back to replay scene
- **Wrong answers:** No penalty; user proceeds down chosen narrative branch
- **Branching:** Answer determines next waypoint (as designed by creator)

### Progress & Pause
- User can pause anytime (close app)
- Progress saved; resume from last completed waypoint
- Access persists for 30 days (+ 2-day grace if mid-quest)

### Quest Completion
1. Final scene plays
2. **Completion screen:**
   - Congratulatory message (comic-book style)
   - Quest stats (time taken, waypoints visited)
   - "Rate this Quest" (5-star selector)
   - "Write a Review" (text input)
   - "Share" button → Social sharing
3. After rating/review → Return to Play tab

---

## Ads (Free Quests)

### Ad Format
- **Video ads** (skippable after 30 seconds)
- Displayed **after each scene** (before questions)

### Ad Provider
- **Google AdMob** (best cross-platform support, high fill rates, good revenue)

### Paid Quests
- No ads

---

## Reviews & Ratings

### Rating System
- 5-star scale
- Only available after quest completion

### Review Submission
- Star rating (required)
- Text review (optional)
- AI moderation: Flag inappropriate content → Admin Portal for human review

### Review Display
- Shown on Quest Detail Page
- Shown in Creator Station (so creators see feedback)
- Public: Username, avatar, stars, text, date

---

## Refund Flow

### Request Process
1. User goes to Profile → Purchase History → Select Quest → "Request Refund"
2. Form fields:
   - Reason (dropdown): Waypoint inaccessible, Technical issue, Accidental purchase, Other
   - Explanation (free text, required)
   - Photo evidence (optional upload)
3. Submit → Sent to Admin Portal for review

### Refund Rules
- Available anytime during 30-day access period
- Admin approves/denies in Admin Portal
- If approved, Stripe refund initiated

---

## User Profile

### Profile Contents
- Avatar (custom upload, preset comic-book avatars, or Google/Apple photo)
- Username
- Quests completed count
- Quests created count (if also a creator)
- Reviews written
- Achievements (future)
- **Settings:**
  - Notification preferences
  - Location preferences
  - Payment methods (manage cards)
  - Quiet hours (10pm-8am default)

### Public Profile (visible to others)
- Avatar
- Username
- Quests completed count
- Quests created count
- Reviews written
- Achievements (future)

---

## Write Tab — Waypoint Scouting

### Purpose
Allow creators to save location data while on-the-go for later use in Creator Station.

### Features
- Map centered on current location
- "Drop Pin" button → Save current location
- For each saved waypoint:
  - GPS coordinates (auto-captured)
  - Name/label (text input)
  - Notes (text input)
  - Photos (camera or gallery)
  - Videos (camera or gallery)
  - Audio recording
- Saved waypoints sync to Creator Station → appear in creator's map/waypoint library

### Integration
- Waypoints saved here appear in Creator Station's map area
- Creators can then use these scouted locations when building quests

---

## Push Notifications

### Notification Types

| Type | Trigger | Message Example |
|------|---------|-----------------|
| Nearby quest | Within 200ft of quest start | "There's an Urban Quest nearby! Tap to explore." |
| New quests in area | New approved quest within X miles | "New quest available near you: [Quest Name]" |
| Continue quest | User has in-progress quest | "Your quest awaits! Continue where you left off." |
| Expiration warning | 3 days before access expires | "Your access to [Quest Name] expires in 3 days!" |
| Grace period | Access expired mid-quest | "You have 2 days to finish [Quest Name]!" |

### Notification Rules
- **Quiet hours:** No notifications 10pm-8am (user-configurable)
- **Nearby quest limit:** Max 3 per week
- **Silence option:** User can silence notifications for specific quests

### Background Location
- App tracks location in background for "nearby quest" alerts
- Required permission: "Always" location access
- Battery-optimized: Geofencing, not continuous GPS

---

## Analytics (Admin Portal)

### Tracked Metrics
- Quest views
- Quest purchases
- Quest completions
- Drop-off points (which waypoint users abandon)
- Filter usage (which filters most popular)
- Average completion time per quest
- Revenue by quest, creator, time period
- User retention
- Notification engagement rates

### Display
- Analytics dashboard in Admin Portal
- Filterable by date range, quest, creator

---

## Technical Specifications

### Platform
- **Framework:** React Native (Expo 54)
- **Navigation:** expo-router (file-based)
- **State:** Zustand

### Key Dependencies
- **Maps:** react-native-maps (Apple Maps on iOS, Google Maps on Android)
- **Location:** expo-location (foreground + background)
- **Payments:** Stripe React Native SDK
- **Ads:** react-native-google-mobile-ads (AdMob)
- **Auth:** expo-auth-session (Google), expo-apple-authentication (Apple)
- **Notifications:** expo-notifications + Firebase Cloud Messaging
- **Media:** expo-av (audio/video playback)
- **Media caching:** Cache unlocked scene media locally

### API Integration
- All data from existing Urban Quest API (Fastify + Prisma)
- New endpoints needed for:
  - Player profiles
  - Quest purchases
  - Quest progress tracking
  - Reviews/ratings
  - Refund requests
  - Waypoint scouting (Write tab)
  - Analytics events

---

## Content Moderation

### Age Ratings
- 4+ (no objectionable content)
- 9+ (mild content)
- 12+ (some mature themes)
- 17+ (mature content)

### Content Restrictions
- Adult themes: **Restricted** (not allowed)
- Heavy violence: **Flagged** → Admin Portal for human review
- Profanity in reviews/usernames: **AI-filtered** → Admin Portal if flagged

---

## MVP Scope (Launch)

### Must-Have
- [x] Login (Apple/Google) with age collection
- [x] Profile with username, avatar, settings
- [x] Map + list view with filters
- [x] Quest detail page with preview
- [x] Quest purchase (Stripe, Apple Pay, Google Pay)
- [x] Quest playback (navigate, play scenes, answer questions)
- [x] 15-meter proximity unlock with sound
- [x] Directions to next waypoint (in-app + native maps)
- [x] Video ads for free quests (AdMob)
- [x] Review/rating after completion
- [x] Push notifications (new quests, continue, expiration)
- [x] Background location "nearby quest" alerts
- [x] Social sharing after completion
- [x] Write tab (waypoint scouting)

### Post-Launch
- [ ] Achievements/badges
- [ ] Refund request flow (email-based initially for MVP)

---

## Open Questions (Resolved)

All questions resolved during design discussion. See conversation history for full Q&A.

---

## Next Steps

1. Review this document for any corrections
2. Update API schema for new player-related models
3. Update Creator Station with difficulty selector and reviews display
4. Begin mobile app implementation (MVP features)
