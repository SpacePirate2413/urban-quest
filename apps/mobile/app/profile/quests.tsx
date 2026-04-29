import { api } from '@/src/services/api';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface PurchasedQuest {
  id: string;
  status: string;
  createdAt: string;
  currentSceneId?: string | null;
  completedAt?: string | null;
  quest?: {
    id: string;
    title: string;
    description?: string;
    coverImage?: string | null;
    estimatedDuration?: number;
    genre?: string;
    waypoints?: { id: string }[];
  };
}

export default function MyQuestsScreen() {
  const [purchases, setPurchases] = useState<PurchasedQuest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getMyPurchases();
      setPurchases(Array.isArray(data) ? data : []);
    } catch {
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // "My Quests" excludes completed runs — those live on the Completed
  // screen so this list stays focused on what the player can resume or
  // start. Sorted with in-progress first (currentSceneId set), then
  // not-yet-started.
  const active = purchases
    .filter((p) => !p.completedAt)
    .sort((a, b) => {
      const aProgress = a.currentSceneId ? 1 : 0;
      const bProgress = b.currentSceneId ? 1 : 0;
      if (aProgress !== bProgress) return bProgress - aProgress;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <ScrollView style={AppStyles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={Typography.headerLarge}>My Quests</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.cyan} size="large" />
        </View>
      ) : active.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={[Typography.headerMedium, styles.emptyTitle]}>No active quests</Text>
          <Text style={[Typography.body, styles.emptyBody]}>
            Browse the map on the Play tab to find a quest near you, or buy a premium one
            from the quest detail screen.
          </Text>
          <TouchableOpacity
            style={styles.cta}
            onPress={() => router.replace('/(tabs)' as any)}
          >
            <Text style={styles.ctaText}>Discover Quests</Text>
          </TouchableOpacity>
        </View>
      ) : (
        active.map((p) => {
          const inProgress = !!p.currentSceneId;
          return (
            <TouchableOpacity
              key={p.id}
              style={styles.questCard}
              onPress={() => p.quest?.id && router.push(`/quest/${p.quest.id}` as any)}
              activeOpacity={0.7}
            >
              {p.quest?.coverImage ? (
                <Image source={{ uri: p.quest.coverImage }} style={styles.cover} />
              ) : (
                <View style={[styles.cover, styles.coverPlaceholder]}>
                  <Text style={{ fontSize: 28 }}>🗺️</Text>
                </View>
              )}
              <View style={styles.questMeta}>
                <View style={styles.titleRow}>
                  <Text style={[Typography.body, styles.questTitle]} numberOfLines={1}>
                    {p.quest?.title ?? 'Untitled quest'}
                  </Text>
                  <View style={[styles.badge, inProgress ? styles.badgeProgress : styles.badgeNew]}>
                    <Text
                      style={[
                        styles.badgeText,
                        inProgress ? styles.badgeProgressText : styles.badgeNewText,
                      ]}
                    >
                      {inProgress ? 'In progress' : 'Not started'}
                    </Text>
                  </View>
                </View>
                {p.quest?.description && (
                  <Text
                    style={[Typography.caption, styles.questDescription]}
                    numberOfLines={2}
                  >
                    {p.quest.description}
                  </Text>
                )}
                <View style={styles.tagsRow}>
                  {p.quest?.genre && (
                    <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
                      {p.quest.genre}
                    </Text>
                  )}
                  {p.quest?.estimatedDuration && (
                    <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
                      · {p.quest.estimatedDuration} min
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}
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
  centered: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.xl,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptyBody: {
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  cta: {
    backgroundColor: Colors.cyan,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  ctaText: {
    color: Colors.primaryBackground,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  questCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  cover: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  coverPlaceholder: {
    backgroundColor: Colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questMeta: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  questTitle: {
    color: Colors.textPrimary,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
  },
  questDescription: {
    color: Colors.textSecondary,
    lineHeight: 16,
    marginBottom: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeProgress: {
    backgroundColor: Colors.accentYellow + '20',
    borderWidth: 1,
    borderColor: Colors.accentYellow,
  },
  badgeNew: {
    backgroundColor: Colors.cyan + '20',
    borderWidth: 1,
    borderColor: Colors.cyan,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeProgressText: {
    color: Colors.accentYellow,
  },
  badgeNewText: {
    color: Colors.cyan,
  },
});
