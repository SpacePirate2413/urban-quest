import { Platform } from 'react-native';
import {
  InterstitialAd,
  TestIds,
} from 'react-native-google-mobile-ads';

// AdMob ad unit IDs. Real production IDs come from app.admob.com → app → ad
// units. Until then we use Google's test IDs (TestIds.INTERSTITIAL) which
// are safe to ship in dev — they show a real-looking test ad without
// counting against any real account or violating AdMob policy.
//
// In production we read the IDs from EXPO_PUBLIC_* env vars set at build
// time so we never hard-code real IDs in source.
function resolveInterstitialId(): string {
  if (__DEV__) return TestIds.INTERSTITIAL;
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS ?? TestIds.INTERSTITIAL,
    android: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID ?? TestIds.INTERSTITIAL,
    default: TestIds.INTERSTITIAL,
  }) as string;
}

export const INTERSTITIAL_AD_UNIT_ID = resolveInterstitialId();

// Frequency cap for interstitials, per Q8d.
// - Maximum one interstitial per `MIN_SCENES_BETWEEN_ADS` scenes.
// - At least `MIN_SECONDS_BETWEEN_ADS` seconds between any two ads regardless
//   of scene cadence (protects against rapid scene transitions and reviewers
//   skim-clicking).
export const MIN_SCENES_BETWEEN_ADS = 2;
export const MIN_SECONDS_BETWEEN_ADS = 60;

export function makeInterstitial() {
  return InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
    requestNonPersonalizedAdsOnly: true, // flipped to false once UMP grants consent
  });
}
