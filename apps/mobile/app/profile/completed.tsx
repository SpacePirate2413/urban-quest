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
  createdAt: string;
  completedAt?: string | null;
  quest?: {
    id: string;
    title: string;
    description?: string;
    coverImage?: string | null;
    genre?: string;
    estimatedDuration?: number;
  };
}

export default function CompletedScreen() {
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

  // Sort completed-quests with most recently finished at the top.
  const completed = purchases
    .filter((p) => !!p.completedAt)
    .sort((a, b) => {
      const aDate = new Date(a.completedAt ?? a.createdAt).getTime();
      const bDate = new Date(b.completedAt ?? b.createdAt).getTime();
      return bDate - aDate;
    });

  const formatDate = (iso?: string | null) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <ScrollView style={AppStyles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={Typography.headerLarge}>Completed</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.cyan} size="large" />
        </View>
      ) : completed.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🏁</Text>
          <Text style={[Typography.headerMedium, styles.emptyTitle]}>No completed quests yet</Text>
          <Text style={[Typography.body, styles.emptyBody]}>
            Finished quests show up here so you can replay favorites or write a review.
            Open a quest from My Quests to pick up where you left off.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.summary}>
            {completed.length} quest{completed.length === 1 ? '' : 's'} finished
          </Text>
          {completed.map((p) => (
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
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>✓ Done</Text>
                  </View>
                </View>
                <Text style={[Typography.caption, styles.completedDate]}>
                  Finished {formatDate(p.completedAt)}
                </Text>
                {p.quest?.genre && (
                  <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
                    {p.quest.genre}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </>
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
  summary: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: Spacing.md,
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
  completedDate: {
    color: Colors.neonGreen,
    marginBottom: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: Colors.neonGreen + '20',
    borderWidth: 1,
    borderColor: Colors.neonGreen,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.neonGreen,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
