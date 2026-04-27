import { useCallback, useEffect, useRef, useState } from 'react';
import { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads';
import {
  MIN_SCENES_BETWEEN_ADS,
  MIN_SECONDS_BETWEEN_ADS,
  makeInterstitial,
} from '../lib/ads';
import { isPremiumNow } from './useSubscription';

interface UseInterstitialReturn {
  /**
   * Call when the player advances to a new scene. The hook decides — based on
   * frequency caps and Premium status — whether to actually show an ad. Awaits
   * the ad's close event before resolving so callers can chain "show next
   * scene" after the user dismisses the ad.
   */
  maybeShowAdAtSceneBoundary: () => Promise<void>;
}

// Singleton because InterstitialAd holds native ad state and we want one
// loaded ad at a time, not one per playback screen mount/unmount cycle.
let interstitial: InterstitialAd | null = null;
let lastShownAt = 0;
let scenesSinceLastAd = MIN_SCENES_BETWEEN_ADS; // start ready to show

function ensureLoaded(): InterstitialAd {
  if (!interstitial) {
    interstitial = makeInterstitial();
    interstitial.load();
  }
  return interstitial;
}

export function useInterstitial(): UseInterstitialReturn {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const checkInFlight = useRef(false);

  // Refresh the premium check whenever this hook mounts. Cached for the
  // lifetime of the playback session — Premium state doesn't change mid-quest
  // in the common case, and re-checking every scene transition is wasteful.
  useEffect(() => {
    if (checkInFlight.current) return;
    checkInFlight.current = true;
    isPremiumNow()
      .then(setIsPremium)
      .catch(() => setIsPremium(false))
      .finally(() => {
        checkInFlight.current = false;
      });
  }, []);

  // Pre-load on mount so the first ad doesn't have a load delay.
  useEffect(() => {
    if (isPremium) return; // don't waste a load if user is premium
    ensureLoaded();
  }, [isPremium]);

  const maybeShowAdAtSceneBoundary = useCallback(async () => {
    scenesSinceLastAd += 1;

    if (isPremium) return;
    if (scenesSinceLastAd < MIN_SCENES_BETWEEN_ADS) return;

    const elapsedMs = Date.now() - lastShownAt;
    if (elapsedMs < MIN_SECONDS_BETWEEN_ADS * 1000) return;

    const ad = ensureLoaded();
    if (!ad.loaded) {
      // Not yet ready — skip this opportunity rather than block on load. The
      // load was kicked off on mount; if it hasn't finished by now, network
      // is slow and the user shouldn't pay for it inside the playback flow.
      return;
    }

    await new Promise<void>((resolve) => {
      const closeListener = ad.addAdEventListener(AdEventType.CLOSED, () => {
        closeListener();
        errorListener();
        // Replace the consumed ad with a fresh one for next time.
        interstitial = makeInterstitial();
        interstitial.load();
        resolve();
      });
      const errorListener = ad.addAdEventListener(AdEventType.ERROR, () => {
        closeListener();
        errorListener();
        resolve();
      });
      ad.show();
      lastShownAt = Date.now();
      scenesSinceLastAd = 0;
    });
  }, [isPremium]);

  return { maybeShowAdAtSceneBoundary };
}
