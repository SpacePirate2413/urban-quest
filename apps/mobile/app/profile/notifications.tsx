import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// In-app notification preferences. These live in AsyncStorage today and act
// as the user's stated preference for each category. When real push lands
// (expo-notifications + a server-side delivery worker), the same keys gate
// whether a given category fires a system notification.
//
// `defaultValue` should reflect what most users want — they can opt-out per
// category from this screen.
type NotificationKey = 'questApproved' | 'questNearby';

interface CategoryDef {
  key: NotificationKey;
  label: string;
  description: string;
  defaultValue: boolean;
}

const CATEGORIES: CategoryDef[] = [
  {
    key: 'questApproved',
    label: 'Quest approvals',
    description: "Tell me when an admin approves or rejects a quest I submitted.",
    defaultValue: true,
  },
  {
    key: 'questNearby',
    label: 'Quests near me',
    description:
      "Send a one-off notification when a new quest goes live within a few miles of my home location.",
    defaultValue: false,
  },
];

const STORAGE_KEY = 'notification_preferences_v1';

type OSStatus = 'granted' | 'denied' | 'undetermined' | 'unknown';

export default function NotificationSettingsScreen() {
  const [prefs, setPrefs] = useState<Record<NotificationKey, boolean>>(() =>
    Object.fromEntries(CATEGORIES.map((c) => [c.key, c.defaultValue])) as Record<
      NotificationKey,
      boolean
    >,
  );
  const [loaded, setLoaded] = useState(false);
  const [osStatus, setOsStatus] = useState<OSStatus>('unknown');
  const [isRequesting, setIsRequesting] = useState(false);

  // Read the OS-level notification permission. Until the app has called
  // requestPermissionsAsync at least once, iOS reports "undetermined" AND
  // does not list the app under Settings → Notifications. Calling
  // requestPermissionsAsync registers the app, so the next time the user
  // opens the system Settings, the Urban Quest row will be there.
  const refreshOsStatus = useCallback(async () => {
    try {
      const result = await Notifications.getPermissionsAsync();
      const status = result.status;
      setOsStatus(
        status === 'granted'
          ? 'granted'
          : status === 'denied'
            ? 'denied'
            : 'undetermined',
      );
    } catch {
      setOsStatus('unknown');
    }
  }, []);

  // Hydrate once from AsyncStorage + read live OS permission. Defaults
  // stand in for the toggle values until we have the saved values so the
  // switches don't flicker on mount.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            setPrefs((current) => ({ ...current, ...parsed }));
          } catch {
            // ignore malformed values; defaults win
          }
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    refreshOsStatus();
    return () => {
      cancelled = true;
    };
  }, [refreshOsStatus]);

  const togglePref = (key: NotificationKey) => {
    setPrefs((current) => {
      const next = { ...current, [key]: !current[key] };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const result = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      const status = result.status;
      setOsStatus(
        status === 'granted'
          ? 'granted'
          : status === 'denied'
            ? 'denied'
            : 'undetermined',
      );
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <ScrollView style={AppStyles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={Typography.headerLarge}>Notifications</Text>
      </View>

      <View style={styles.osCard}>
        <View style={styles.osHeader}>
          <Text style={styles.sectionLabel}>System Permission</Text>
          <View
            style={[
              styles.statusBadge,
              {
                borderColor:
                  osStatus === 'granted'
                    ? Colors.neonGreen
                    : osStatus === 'denied'
                      ? Colors.hotPink
                      : Colors.accentYellow,
              },
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                {
                  color:
                    osStatus === 'granted'
                      ? Colors.neonGreen
                      : osStatus === 'denied'
                        ? Colors.hotPink
                        : Colors.accentYellow,
                },
              ]}
            >
              {osStatus === 'granted'
                ? 'On'
                : osStatus === 'denied'
                  ? 'Off'
                  : osStatus === 'undetermined'
                    ? 'Not asked'
                    : 'Unknown'}
            </Text>
          </View>
        </View>

        <Text style={[Typography.body, { color: Colors.textSecondary, lineHeight: 20 }]}>
          {osStatus === 'granted'
            ? "Urban Quest can deliver push notifications. Manage which categories below, or open Settings to fine-tune at the OS level."
            : osStatus === 'denied'
              ? "You blocked Urban Quest notifications. Re-enable them from your device's Settings app — once you do, the categories below take over."
              : "Urban Quest hasn't asked for notification permission yet. Tap below to enable; this also makes Urban Quest appear under iOS Settings → Notifications."}
        </Text>

        {osStatus === 'undetermined' && (
          <TouchableOpacity
            style={[styles.cta, isRequesting && { opacity: 0.6 }]}
            onPress={handleRequestPermission}
            disabled={isRequesting}
          >
            {isRequesting ? (
              <ActivityIndicator color={Colors.primaryBackground} />
            ) : (
              <Text style={styles.ctaText}>Allow Notifications</Text>
            )}
          </TouchableOpacity>
        )}

        {osStatus !== 'undetermined' && (
          <TouchableOpacity style={styles.cta} onPress={() => Linking.openSettings()}>
            <Text style={styles.ctaText}>Open Notification Settings</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>What you receive</Text>
        <Text style={[Typography.caption, styles.sectionHint]}>
          Toggle each category to opt in or out. System permission still has to be on (above) for
          any of these to actually deliver.
        </Text>

        {CATEGORIES.map((cat) => (
          <View key={cat.key} style={styles.row}>
            <View style={styles.rowText}>
              <Text style={[Typography.body, styles.rowLabel]}>{cat.label}</Text>
              <Text style={[Typography.caption, styles.rowDescription]}>{cat.description}</Text>
            </View>
            <Switch
              value={prefs[cat.key]}
              onValueChange={() => togglePref(cat.key)}
              disabled={!loaded}
              trackColor={{ false: Colors.border, true: Colors.cyan + '80' }}
              thumbColor={prefs[cat.key] ? Colors.cyan : Colors.textSecondary}
              ios_backgroundColor={Colors.border}
            />
          </View>
        ))}
      </View>

      <Text
        style={[
          Typography.caption,
          { textAlign: 'center', color: Colors.textSecondary, marginTop: Spacing.lg, lineHeight: 16 },
        ]}
      >
        Quiet hours are coming in a future update.
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
  osCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  osHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontSize: 11,
    color: Colors.cyan,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  sectionHint: {
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 16,
  },
  cta: {
    marginTop: Spacing.md,
    backgroundColor: Colors.cyan,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  ctaText: {
    color: Colors.primaryBackground,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  rowDescription: {
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});
