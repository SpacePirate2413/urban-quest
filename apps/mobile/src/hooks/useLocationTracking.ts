import * as Location from 'expo-location';
import { useEffect } from 'react';
import { useLocationStore } from '../store';

// Foreground-only tracking. Background location is intentionally not requested
// (see docs/Questions-Left.md Q20). The app declares location use in
// app.json + the live Privacy Policy, so this hook is what makes that claim
// truthful — Apple rejects builds that declare permission strings without
// actually invoking the corresponding API.
export function useLocationTracking() {
  const { locationPermission, setLocationPermission, setCurrentLocation } = useLocationStore();

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    async function start() {
      const existing = await Location.getForegroundPermissionsAsync();

      let status = existing.status;
      // Only re-prompt if the user has not already responded. If they denied,
      // respect that — they can change it in Settings or on the onboarding screen.
      if (status === Location.PermissionStatus.UNDETERMINED) {
        const requested = await Location.requestForegroundPermissionsAsync();
        status = requested.status;
      }

      if (cancelled) return;

      if (status !== Location.PermissionStatus.GRANTED) {
        setLocationPermission('denied');
        setCurrentLocation(null);
        return;
      }

      setLocationPermission('granted');

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 10,
          timeInterval: 5000,
        },
        (loc) => {
          setCurrentLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        },
      );
    }

    start().catch(() => {
      // Permission errors are expected on simulators and on devices where the
      // user has location disabled at the OS level. Fail closed.
      if (!cancelled) {
        setLocationPermission('denied');
        setCurrentLocation(null);
      }
    });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
    // Only run once per mount; locationPermission is read inside but a re-run on
    // permission change would tear down the active subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return locationPermission;
}
