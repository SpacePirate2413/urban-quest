import * as TrackingTransparency from 'expo-tracking-transparency';
import mobileAds, {
  AdsConsent,
  AdsConsentDebugGeography,
  AdsConsentStatus,
  MaxAdContentRating,
} from 'react-native-google-mobile-ads';

// Bootstraps the ad stack so it's ready before the first interstitial is
// requested. Idempotent — safe to call from app boot or from a screen that
// regains focus.
//
// Ordering matters here:
//   1. Request UMP (Google User Messaging Platform) consent for EU users.
//      If they're outside the EEA/UK, this is a no-op.
//   2. Initialize the AdMob SDK with conservative defaults.
//   3. Request ATT (Apple App Tracking Transparency) — only after UMP, because
//      Apple requires the prompt explanation to be shown before the system
//      sheet appears, and UMP handles that gating for us.
//
// This is fire-and-forget at app boot. No callsite waits on it.
export async function initializeAdStack(): Promise<void> {
  try {
    // 1. UMP consent for EEA/UK users.
    const consentInfo = await AdsConsent.requestInfoUpdate(
      __DEV__
        ? {
            // Force the prompt to show in dev so we can verify the flow.
            debugGeography: AdsConsentDebugGeography.EEA,
          }
        : {},
    );

    if (
      consentInfo.isConsentFormAvailable &&
      consentInfo.status === AdsConsentStatus.REQUIRED
    ) {
      await AdsConsent.showForm();
    }
  } catch {
    // UMP is optional from the app's perspective — if it fails we still serve
    // non-personalized ads via `requestNonPersonalizedAdsOnly: true`.
  }

  try {
    // 2. AdMob SDK init. T (max content rating) keeps gambling/alcohol ads off,
    // which both stores expect for general-audience apps.
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.T,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });
    await mobileAds().initialize();
  } catch {
    // If the SDK can't init the user simply won't see ads. Better than
    // crashing the app.
  }

  try {
    // 3. ATT prompt (iOS only). On Android this is a no-op.
    const status = await TrackingTransparency.getTrackingPermissionsAsync();
    if (status.status === 'undetermined') {
      await TrackingTransparency.requestTrackingPermissionsAsync();
    }
  } catch {
    // ATT is also optional from a "show ads" standpoint — when the user
    // declines we just show non-personalized ads.
  }
}
