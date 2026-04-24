import { useQuestStore } from '@/src/store';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '@/src/services/api';
import { Quest, QuestStatus } from '@/src/types';

export default function QuestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { quests, selectedQuest, selectQuest } = useQuestStore();

  const storeQuest = quests.find((q) => q.id === id) || selectedQuest;
  const [quest, setQuest] = useState<Quest | null>(storeQuest);
  const [isLoading, setIsLoading] = useState(!storeQuest);
  const [error, setError] = useState<string | null>(null);

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
            authorAvatarUrl: data.author?.avatarUrl,
            status: QuestStatus.PUBLISHED,
            coverImageUrl: data.coverImage || '',
            estimatedDurationMinutes: data.estimatedDuration || 60,
            estimatedDistanceMeters: data.totalDistance || 0,
            difficulty: data.difficulty || 'Moderate',
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
            waypoints: (data.waypoints || []).map((wp: any, i: number) => ({
              id: wp.id,
              questId: data.id,
              title: wp.name || `Waypoint ${i + 1}`,
              description: wp.description || '',
              order: i + 1,
              location: { latitude: wp.lat || 0, longitude: wp.lng || 0 },
              radius: 15,
              scenes: [],
            })),
            reviews: [],
          };
          setQuest(q);
          selectQuest(q);
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
          Loading quest...
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
          {error || 'This quest could not be loaded.'}
        </Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handlePurchase = () => {
    router.push(`/quest/checkout?id=${quest.id}`);
  };

  const renderStars = (rating: number) => {
    return '⭐'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '½' : '');
  };

  return (
    <View style={AppStyles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {quest.coverImageUrl ? (
          <Image source={{ uri: quest.coverImageUrl }} style={styles.coverImage} />
        ) : (
          <View style={[styles.coverImage, { backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ fontSize: 50 }}>🎮</Text>
          </View>
        )}

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={Typography.headerLarge}>{quest.title}</Text>
              {quest.isFree && (
                <View style={styles.freeTag}>
                  <Text style={styles.freeTagText}>FREE w/ ADS</Text>
                </View>
              )}
            </View>
            <Text style={[Typography.body, { color: Colors.accentCyan, marginTop: Spacing.xs }]}>
              {quest.tagline}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{quest.averageRating ? renderStars(quest.averageRating) : 'New'}</Text>
              <Text style={styles.statLabel}>{quest.averageRating?.toFixed(1) || 'No ratings'} ({quest.reviewCount})</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{quest.estimatedDurationMinutes}</Text>
              <Text style={styles.statLabel}>minutes</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{quest.estimatedDistanceMeters > 0 ? (quest.estimatedDistanceMeters / 1609).toFixed(1) : '—'}</Text>
              <Text style={styles.statLabel}>miles</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={Typography.headerMedium}>About This Quest</Text>
            <Text style={[Typography.body, { marginTop: Spacing.sm }]}>{quest.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={Typography.headerMedium}>Details</Text>
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Genre</Text>
                <Text style={styles.detailValue}>{quest.category}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Age Rating</Text>
                <Text style={styles.detailValue}>{quest.ageRating}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Price</Text>
                <Text style={[styles.detailValue, { color: quest.isFree ? Colors.success : Colors.accentYellow }]}>
                  {quest.isFree ? 'Free' : `$${quest.price.toFixed(2)}`}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Est. Duration</Text>
                <Text style={styles.detailValue}>
                  {quest.estimatedDurationMinutes ? `${quest.estimatedDurationMinutes} min` : 'Not set'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={Typography.headerMedium}>Starting Location</Text>
            <View style={styles.mapPreview}>
              <Text style={{ fontSize: 30 }}>📍</Text>
              <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: Spacing.sm }]}>
                {quest.firstWaypointLocation.latitude !== 0
                  ? `${quest.firstWaypointLocation.latitude.toFixed(4)}°N, ${Math.abs(quest.firstWaypointLocation.longitude).toFixed(4)}°W`
                  : 'Location not set'}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={Typography.headerMedium}>Preview</Text>
            <TouchableOpacity style={styles.previewPlayer}>
              <Text style={{ fontSize: 40 }}>▶️</Text>
              <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: Spacing.sm }]}>
                10 second preview
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.creatorCard} onPress={() => router.push(`/creator/${quest.authorId}` as any)}>
            {quest.authorAvatarUrl ? (
              <Image source={{ uri: quest.authorAvatarUrl }} style={styles.creatorAvatar} />
            ) : (
              <View style={[styles.creatorAvatar, { backgroundColor: Colors.inputBg, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 20 }}>👤</Text>
              </View>
            )}
            <View style={styles.creatorInfo}>
              <Text style={Typography.body}>Created by</Text>
              <Text style={[Typography.headerMedium, { color: Colors.accentYellow }]}>
                {quest.authorUsername}
              </Text>
            </View>
            <Text style={styles.creatorArrow}>→</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={Typography.headerMedium}>Reviews</Text>
              <Text style={[Typography.caption, { color: Colors.accentYellow }]}>See all →</Text>
            </View>
            {quest.reviews.slice(0, 2).map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  {review.avatarUrl ? (
                    <Image source={{ uri: review.avatarUrl }} style={styles.reviewerAvatar} />
                  ) : (
                    <View style={[styles.reviewerAvatar, { backgroundColor: Colors.inputBg, justifyContent: 'center', alignItems: 'center' }]}>
                      <Text style={{ fontSize: 14 }}>👤</Text>
                    </View>
                  )}
                  <View style={styles.reviewerInfo}>
                    <Text style={Typography.body}>{review.username}</Text>
                    <Text style={Typography.caption}>{renderStars(review.rating)}</Text>
                  </View>
                  <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
                    {new Date(review.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                {review.text && (
                  <Text style={[Typography.body, { marginTop: Spacing.sm }]}>{review.text}</Text>
                )}
              </View>
            ))}
            {quest.reviews.length === 0 && (
              <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
                No reviews yet. Be the first!
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.purchaseBar}>
        <View style={styles.priceContainer}>
          {quest.isFree ? (
            <Text style={styles.priceText}>Free</Text>
          ) : (
            <Text style={styles.priceText}>${quest.price.toFixed(2)}</Text>
          )}
          <Text style={[Typography.caption, { color: Colors.textSecondary }]}>30 days access</Text>
        </View>
        <TouchableOpacity style={styles.purchaseButton} onPress={handlePurchase}>
          <Text style={styles.purchaseButtonText}>
            {quest.isFree ? 'Start Quest' : 'Buy Now'}
          </Text>
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
  errorButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.cyan,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  errorButtonText: {
    color: Colors.primaryBackground,
    fontWeight: '700',
    fontSize: 16,
  },
  coverImage: {
    width: '100%',
    height: 250,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: Spacing.lg,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: Colors.textPrimary,
    fontSize: 24,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 120,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  freeTag: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  freeTagText: {
    color: Colors.primaryBackground,
    fontSize: 10,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.accentYellow,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  detailsGrid: {
    marginTop: Spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  detailValue: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  mapPreview: {
    height: 120,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  previewPlayer: {
    height: 100,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  creatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  creatorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: Spacing.md,
  },
  creatorInfo: {
    flex: 1,
  },
  creatorArrow: {
    fontSize: 24,
    color: Colors.accentYellow,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  reviewCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: Spacing.sm,
  },
  reviewerInfo: {
    flex: 1,
  },
  purchaseBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    paddingBottom: 34,
    borderTopWidth: 2,
    borderTopColor: Colors.border,
  },
  priceContainer: {
    flex: 1,
  },
  priceText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.accentYellow,
  },
  purchaseButton: {
    backgroundColor: Colors.accentYellow,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
  },
  purchaseButtonText: {
    color: Colors.primaryBackground,
    fontWeight: '700',
    fontSize: 16,
  },
});
