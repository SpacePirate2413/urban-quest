import { api } from '@/src/services/api';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
  questId: string;
  quest?: {
    id: string;
    title: string;
    coverImage?: string | null;
  };
}

export default function MyReviewsScreen() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getMyReviews();
      setReviews(Array.isArray(data) ? data : []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Delete is offered per Apple App Review Guideline 1.2 (UGC apps must
  // give users a way to remove their own contributions). The optimistic
  // update keeps the list snappy; we revert if the API call fails.
  const handleDelete = (review: Review) => {
    Alert.alert(
      'Delete review?',
      `Remove your review of "${review.quest?.title ?? 'this quest'}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(review.id);
            const previous = reviews;
            setReviews((current) => current.filter((r) => r.id !== review.id));
            try {
              await api.deleteReview(review.questId);
            } catch (err: any) {
              setReviews(previous);
              Alert.alert('Could not delete', err?.message ?? 'Please try again.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  return (
    <ScrollView style={AppStyles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={Typography.headerLarge}>My Reviews</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.cyan} size="large" />
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>⭐</Text>
          <Text style={[Typography.headerMedium, styles.emptyTitle]}>No reviews yet</Text>
          <Text style={[Typography.body, styles.emptyBody]}>
            After you finish a quest, you can leave a star rating and a short note about
            your experience. Your reviews help other players pick what to play next.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.summary}>
            {reviews.length} review{reviews.length === 1 ? '' : 's'} written
          </Text>
          {reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <TouchableOpacity
                style={styles.reviewBody}
                onPress={() =>
                  review.quest?.id && router.push(`/quest/${review.quest.id}` as any)
                }
                activeOpacity={0.7}
              >
                {review.quest?.coverImage ? (
                  <Image source={{ uri: review.quest.coverImage }} style={styles.cover} />
                ) : (
                  <View style={[styles.cover, styles.coverPlaceholder]}>
                    <Text style={{ fontSize: 24 }}>🗺️</Text>
                  </View>
                )}
                <View style={styles.reviewMeta}>
                  <Text style={[Typography.body, styles.questTitle]} numberOfLines={1}>
                    {review.quest?.title ?? 'Untitled quest'}
                  </Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Text
                        key={n}
                        style={[
                          styles.star,
                          { opacity: n <= review.rating ? 1 : 0.25 },
                        ]}
                      >
                        ★
                      </Text>
                    ))}
                    <Text
                      style={[Typography.caption, styles.dateText]}
                      numberOfLines={1}
                    >
                      {formatDate(review.createdAt)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {review.comment ? (
                <Text style={[Typography.body, styles.comment]}>{review.comment}</Text>
              ) : (
                <Text style={[Typography.caption, styles.commentEmpty]}>
                  No written comment.
                </Text>
              )}

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(review)}
                disabled={deletingId === review.id}
              >
                {deletingId === review.id ? (
                  <ActivityIndicator color={Colors.hotPink} size="small" />
                ) : (
                  <Text style={styles.deleteBtnText}>Delete review</Text>
                )}
              </TouchableOpacity>
            </View>
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
  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  reviewBody: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  coverPlaceholder: {
    backgroundColor: Colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewMeta: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  questTitle: {
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  star: {
    color: Colors.accentYellow,
    fontSize: 14,
  },
  dateText: {
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  comment: {
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  commentEmpty: {
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
  },
  deleteBtn: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
    minHeight: 36,
    justifyContent: 'center',
  },
  deleteBtnText: {
    color: Colors.hotPink,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
