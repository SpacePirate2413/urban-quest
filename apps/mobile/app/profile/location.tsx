import { useLocationStore } from '@/src/store';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function LocationSettingsScreen() {
  const { currentLocation, locationPermission, setLocationPermission, setCurrentLocation } =
    useLocationStore();
  const [isRequesting, setIsRequesting] = useState(false);
  const [systemEnabled, setSystemEnabled] = useState<boolean | null>(null);

  // Refresh the OS-level permission status on mount so this screen never
  // shows stale info. The store value is updated whenever the app boots,
  // but if the user toggled the system setting since then we want to
  // reflect that now.
  const refreshStatus = useCallback(async () => {
    try {
      const [permission, enabled] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        Location.hasServicesEnabledAsync(),
      ]);
      setLocationPermission(
        permission.status === Location.PermissionStatus.GRANTED
          ? 'granted'
          : permission.status === Location.PermissionStatus.DENIED
            ? 'denied'
            : 'undetermined',
      );
      setSystemEnabled(enabled);
    } catch {
      // best-effort; keep whatever was in the store
    }
  }, [setLocationPermission]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const result = await Location.requestForegroundPermissionsAsync();
      if (result.status === Location.PermissionStatus.GRANTED) {
        setLocationPermission('granted');
        // Pull a fresh fix so the screen shows real coordinates immediately.
        try {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setCurrentLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        } catch {
          // ignore — useLocationTracking will pick this up next time
        }
      } else {
        setLocationPermission('denied');
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  const config = (() => {
    if (locationPermission === 'granted') {
      return {
        badge: 'Granted',
        badgeColor: Colors.neonGreen,
        title: 'Location is on',
        body:
          "Urban Quest can detect when you reach quest waypoints and anchor your scouted waypoints to the real world. We only collect your location while the app is open.",
      };
    }
    if (locationPermission === 'denied') {
      return {
        badge: 'Off',
        badgeColor: Colors.hotPink,
        title: 'Location is turned off',
        body:
          "Without location, quests can't trigger when you arrive at waypoints and you won't be able to scout new ones. You can re-enable it from your device's Settings app.",
      };
    }
    return {
      badge: 'Not asked',
      badgeColor: Colors.accentYellow,
      title: 'Location not enabled yet',
      body:
        "Urban Quest uses your location while the app is open to detect when you reach a quest's waypoints. Tap below to enable it — we never use it for advertising.",
    };
  })();

  return (
    <ScrollView style={AppStyles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={Typography.headerLarge}>Location Settings</Text>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={[styles.badge, { borderColor: config.badgeColor }]}>
            <Text style={[styles.badgeText, { color: config.badgeColor }]}>{config.badge}</Text>
          </View>
        </View>
        <Text style={[Typography.headerMedium, styles.statusTitle]}>{config.title}</Text>
        <Text style={[Typography.body, styles.statusBody]}>{config.body}</Text>

        {locationPermission === 'granted' && systemEnabled === false && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Location services are disabled at the system level. Enable them in Settings →
              Privacy & Security → Location Services.
            </Text>
          </View>
        )}
      </View>

      {locationPermission === 'undetermined' && (
        <TouchableOpacity
          style={[styles.cta, isRequesting && { opacity: 0.6 }]}
          onPress={handleRequestPermission}
          disabled={isRequesting}
        >
          {isRequesting ? (
            <ActivityIndicator color={Colors.primaryBackground} />
          ) : (
            <Text style={styles.ctaText}>Enable Location</Text>
          )}
        </TouchableOpacity>
      )}

      {locationPermission === 'denied' && (
        <TouchableOpacity style={styles.cta} onPress={handleOpenSettings}>
          <Text style={styles.ctaText}>Open Settings</Text>
        </TouchableOpacity>
      )}

      {locationPermission === 'granted' && currentLocation && (
        <View style={styles.detailCard}>
          <Text style={styles.sectionLabel}>Current Location</Text>
          <View style={styles.coordRow}>
            <Text style={[Typography.caption, { color: Colors.textSecondary }]}>Latitude</Text>
            <Text style={[Typography.body, styles.coordValue]}>
              {currentLocation.latitude.toFixed(6)}°
            </Text>
          </View>
          <View style={styles.coordRow}>
            <Text style={[Typography.caption, { color: Colors.textSecondary }]}>Longitude</Text>
            <Text style={[Typography.body, styles.coordValue]}>
              {currentLocation.longitude.toFixed(6)}°
            </Text>
          </View>
        </View>
      )}

      <View style={styles.detailCard}>
        <Text style={styles.sectionLabel}>How we use it</Text>
        <Text style={[Typography.body, styles.detailLine]}>
          • Detect when you arrive at a waypoint to trigger the next scene
        </Text>
        <Text style={[Typography.body, styles.detailLine]}>
          • Anchor scouted waypoints when you create your own quest
        </Text>
        <Text style={[Typography.body, styles.detailLine]}>
          • Show quests near you on the map
        </Text>
        <Text
          style={[
            Typography.caption,
            { color: Colors.textSecondary, marginTop: Spacing.sm, lineHeight: 16 },
          ]}
        >
          We collect location only while the app is open and never share it for advertising or
          tracking. See our Privacy Policy for the full details.
        </Text>
      </View>

      <Text
        style={[
          Typography.caption,
          { textAlign: 'center', color: Colors.textSecondary, marginTop: Spacing.lg },
        ]}
      >
        Platform: {Platform.OS === 'ios' ? 'iOS' : 'Android'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingTop: 60,
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  backBtnText: {
    color: Colors.textPrimary,
    fontSize: 28,
    lineHeight: 30,
  },
  statusCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusTitle: {
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  statusBody: {
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  warningBox: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.accentYellow + '15',
    borderWidth: 1,
    borderColor: Colors.accentYellow,
  },
  warningText: {
    color: Colors.accentYellow,
    fontSize: 12,
    lineHeight: 16,
  },
  cta: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.cyan,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  ctaText: {
    color: Colors.primaryBackground,
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginTop: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    color: Colors.cyan,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  coordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  coordValue: {
    color: Colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  detailLine: {
    color: Colors.textSecondary,
    lineHeight: 20,
    marginVertical: 2,
  },
});
