import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';
import { useQuestStore } from '@/src/store';
import { api } from '@/src/services/api';
import { Quest } from '@/src/types';
import { tierFromPrice } from '@/src/lib/monetization';
import { purchaseQuestProduct } from '@/src/hooks/useSubscription';

export default function CheckoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedQuest, quests, purchaseQuest } = useQuestStore();
  const [quest, setQuest] = useState<Quest | null>(
    quests.find((q) => q.id === id) || selectedQuest
  );
  const [isLoading, setIsLoading] = useState(!quest);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!quest && id) {
      setIsLoading(true);
      api.getQuest(id)
        .then((data: any) => {
          const q: Quest = {
            id: data.id,
            title: data.title,
            tagline: data.description?.slice(0, 100) || '',
            description: data.description || '',
            authorId: data.author?.id || data.authorId || '',
            authorUsername: data.author?.name || 'Unknown',
            status: data.status,
            coverImageUrl: data.coverImage || '',
            estimatedDurationMinutes: data.estimatedDuration || 60,
            estimatedDistanceMeters: data.totalDistance || 0,
            price: data.price ?? 0,
            isFree: (data.price ?? 0) === 0,
            ageRating: data.ageRating || '4+',
            category: data.genre || 'Adventure',
            playerCount: data._count?.purchases || 0,
            minPlayers: 1,
            maxPlayers: 4,
            averageRating: data.averageRating,
            reviewCount: data._count?.reviews || 0,
            createdAt: new Date(data.createdAt),
            firstWaypointLocation: {
              latitude: data.waypoints?.[0]?.lat || 0,
              longitude: data.waypoints?.[0]?.lng || 0,
            },
            characters: [],
            waypoints: [],
            reviews: [],
          };
          setQuest(q);
          setIsLoading(false);
        })
        .catch((err: any) => {
          setError(err.message || 'Failed to load quest');
          setIsLoading(false);
        });
    }
  }, [id]);

  if (isLoading) {
    return (
      <View style={[AppStyles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.cyan} />
        <Text style={[Typography.body, { color: Colors.textSecondary, marginTop: Spacing.md }]}>
          Loading checkout...
        </Text>
      </View>
    );
  }

  if (error || !quest) {
    return (
      <View style={[AppStyles.container, styles.centered]}>
        <Text style={{ fontSize: 40 }}>❌</Text>
        <Text style={[Typography.headerMedium, { marginTop: Spacing.md }]}>Quest Not Found</Text>
        <Text style={[Typography.body, { color: Colors.textSecondary, marginTop: Spacing.sm, textAlign: 'center' }]}>
          {error || 'Could not load quest details.'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handlePurchase = async () => {
    setIsProcessing(true);
    try {
      // Free quest — record the start without going through IAP.
      if (quest.isFree) {
        await purchaseQuest(quest.id);
        router.replace(`/quest/play?id=${quest.id}`);
        return;
      }

      // Paid quest — route through RevenueCat / StoreKit / Play Billing.
      const tier = tierFromPrice(quest.price);
      if (!tier.productId) {
        Alert.alert('Unavailable', 'This quest cannot be purchased right now.');
        return;
      }
      const { cancelled, transactionIdentifier } = await purchaseQuestProduct(
        tier.productId,
      );
      if (cancelled) return; // user dismissed the IAP sheet — no-op

      // Record the entitlement on our backend so we can resolve "owned" without
      // re-querying RevenueCat on every screen. The webhook (follow-up task)
      // will keep this canonical for refunds and revocations.
      await api.purchaseQuest(quest.id, transactionIdentifier ?? undefined);
      router.replace(`/quest/play?id=${quest.id}`);
    } catch (err: any) {
      Alert.alert('Purchase failed', err?.message ?? 'Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={AppStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={Typography.headerLarge}>CHECKOUT</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.questSummary}>
          {quest.coverImageUrl ? (
            <Image source={{ uri: quest.coverImageUrl }} style={styles.questImage} />
          ) : (
            <View style={[styles.questImage, { backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ fontSize: 30 }}>🎮</Text>
            </View>
          )}
          <View style={styles.questInfo}>
            <Text style={Typography.headerMedium}>{quest.title}</Text>
            <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
              {quest.estimatedDurationMinutes} min
            </Text>
            <Text style={[Typography.caption, { color: Colors.accentCyan, marginTop: Spacing.xs }]}>
              30 days access
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={Typography.headerMedium}>Order Summary</Text>
          <View style={styles.orderSummary}>
            <View style={styles.summaryRow}>
              <Text style={Typography.body}>Quest Price</Text>
              <Text style={Typography.body}>
                {quest.isFree ? 'Free' : `$${quest.price.toFixed(2)}`}
              </Text>
            </View>
            {quest.isFree && (
              <View style={styles.summaryRow}>
                <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
                  Includes ads after each scene
                </Text>
              </View>
            )}
            {!quest.isFree && (
              <View style={styles.summaryRow}>
                <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
                  Charged via your Apple ID or Google account
                </Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={[Typography.headerMedium, { color: Colors.textPrimary }]}>Total</Text>
              <Text style={[Typography.headerMedium, { color: Colors.accentYellow }]}>
                {quest.isFree ? 'Free' : `$${quest.price.toFixed(2)}`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.termsSection}>
          <Text style={[Typography.caption, { color: Colors.textSecondary, textAlign: 'center' }]}>
            By completing this purchase, you agree to our Terms of Service.
            Your access expires 30 days after purchase.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.purchaseButton, isProcessing && styles.purchaseButtonDisabled]}
          onPress={handlePurchase}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Text style={styles.purchaseButtonText}>Processing...</Text>
          ) : (
            <Text style={styles.purchaseButtonText}>
              {quest.isFree ? 'Start Quest' : `Pay $${quest.price.toFixed(2)}`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  header: {
    padding: Spacing.lg,
    paddingTop: 60,
  },
  backButton: {
    color: Colors.accentYellow,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    paddingTop: 0,
  },
  questSummary: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  questImage: {
    width: 100,
    height: 100,
  },
  questInfo: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'center',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  orderSummary: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 12,
    marginTop: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
  },
  termsSection: {
    paddingVertical: Spacing.lg,
  },
  footer: {
    padding: Spacing.lg,
    paddingBottom: 34,
    backgroundColor: Colors.surface,
    borderTopWidth: 2,
    borderTopColor: Colors.border,
  },
  purchaseButton: {
    backgroundColor: Colors.accentYellow,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    color: Colors.primaryBackground,
    fontWeight: '700',
    fontSize: 18,
  },
  retryButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.cyan,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.primaryBackground,
    fontWeight: '700',
    fontSize: 16,
  },
});
