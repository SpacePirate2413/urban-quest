import { ContentMenu } from '@/src/components/moderation/ContentMenu';
import { useQuestStore } from '@/src/store';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';
import { Audio, ResizeMode, Video } from 'expo-av';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { api } from '@/src/services/api';
import { Quest, QuestStatus } from '@/src/types';

// Strip the trailing /api so we can prefix relative scene mediaUrl values
// (the API stores them as `/api/media/scene-...mp3`). Same convention used
// in app/quest/play.tsx.
const API_HOST = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '');

const PREVIEW_DURATION_MS = 10_000;

function fullMediaUrl(rel: string | null | undefined): string | null {
  if (!rel) return null;
  if (/^https?:\/\//.test(rel)) return rel;
  return `${API_HOST}${rel.startsWith('/') ? rel : `/${rel}`}`;
}

type PreviewMedia = { url: string; type: 'audio' | 'video' };

export default function QuestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { quests, selectedQuest, selectQuest } = useQuestStore();

  const storeQuest = quests.find((q) => q.id === id) || selectedQuest;
  const [quest, setQuest] = useState<Quest | null>(storeQuest);
  const [isLoading, setIsLoading] = useState(!storeQuest);
  const [error, setError] = useState<string | null>(null);

  // First scene's media — captured from the raw API response so the
  // Preview button can play 10 s before the player commits to buying.
  const [previewMedia, setPreviewMedia] = useState<PreviewMedia | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0); // 0..1 over 10 s
  const previewSoundRef = useRef<Audio.Sound | null>(null);
  const previewVideoRef = useRef<Video | null>(null);
  const previewStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewProgressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id) return;
    // Always pull the API payload (even if we already have a Quest from
    // the store) so we can capture the first scene's media for the Preview
    // button — the store doesn't carry scenes today.
    if (!quest) setIsLoading(true);
    api.getQuest(id)
      .then((data: any) => {
        // Capture first-scene media for the 10-second preview.
        const scenes: any[] = Array.isArray(data?.scenes) ? data.scenes : [];
        const firstWithMedia = scenes
          .slice()
          .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
          .find((s) => s?.mediaUrl);
        if (firstWithMedia) {
          const url = fullMediaUrl(firstWithMedia.mediaUrl);
          const type = firstWithMedia.mediaType === 'video' ? 'video' : 'audio';
          if (url) setPreviewMedia({ url, type });
        }
        // Only build the Quest local state if the store didn't already
        // give us one (avoids re-mapping work and keeps any in-store
        // updates from being overwritten).
        if (!quest) {
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
            price: data.price ?? 0,
            isFree: (data.price ?? 0) === 0,
            ageRating: data.ageRating || '4+',
            category: data.genre || 'Adventure',
            playerCount: data._count?.purchases || 0,
            minPlayers: 1,
            maxPlayers: 4,
            averageRating: data.averageRating,
            reviewCount: data._count?.reviews || 0,
            mediaType: data.mediaType === 'video' ? 'video' : data.mediaType === 'audio' ? 'audio' : undefined,
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
        }
        setIsLoading(false);
      })
      .catch((err: any) => {
        if (!quest) setError(err.message || 'Failed to load quest');
        setIsLoading(false);
      });
    // We deliberately re-run only on `id`. `quest` and `selectQuest` are
    // read inside the effect to decide whether to rebuild local state,
    // but if we re-fetched on every quest change we'd hit the API in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Stop & unload preview audio when the screen unmounts so it doesn't
  // keep playing in the background after the user navigates away.
  useEffect(() => {
    return () => {
      previewSoundRef.current?.unloadAsync().catch(() => {});
      previewSoundRef.current = null;
      if (previewStopTimerRef.current) clearTimeout(previewStopTimerRef.current);
      if (previewProgressTimerRef.current) clearInterval(previewProgressTimerRef.current);
    };
  }, []);

  /** Cleanly stops the preview, whether it's audio or video. */
  const stopPreview = async () => {
    if (previewStopTimerRef.current) {
      clearTimeout(previewStopTimerRef.current);
      previewStopTimerRef.current = null;
    }
    if (previewProgressTimerRef.current) {
      clearInterval(previewProgressTimerRef.current);
      previewProgressTimerRef.current = null;
    }
    setIsPreviewPlaying(false);
    setPreviewProgress(0);
    if (previewSoundRef.current) {
      try {
        await previewSoundRef.current.stopAsync();
        await previewSoundRef.current.unloadAsync();
      } catch {
        // Audio may have already unloaded — fine.
      }
      previewSoundRef.current = null;
    }
    if (previewVideoRef.current) {
      try {
        await previewVideoRef.current.pauseAsync();
        await previewVideoRef.current.setPositionAsync(0);
      } catch {
        // ignore
      }
    }
  };

  /** Starts the 10 s preview from the beginning. Called by the ▶ button. */
  const startPreview = async () => {
    if (!previewMedia) return;
    if (isPreviewPlaying) {
      await stopPreview();
      return;
    }

    // Update the visual progress bar 20× per second so it feels live.
    const startedAt = Date.now();
    previewProgressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setPreviewProgress(Math.min(1, elapsed / PREVIEW_DURATION_MS));
    }, 50);

    // Schedule the hard stop at 10 s regardless of audio/video — Apple
    // App Review guidelines and our paid-content policy require the
    // teaser to truly cap at the configured length.
    previewStopTimerRef.current = setTimeout(() => {
      stopPreview();
    }, PREVIEW_DURATION_MS);

    setIsPreviewPlaying(true);

    if (previewMedia.type === 'audio') {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        const { sound } = await Audio.Sound.createAsync(
          { uri: previewMedia.url },
          { shouldPlay: true, positionMillis: 0 },
        );
        previewSoundRef.current = sound;
      } catch {
        // If audio loading fails, just bail — visual feedback continues briefly.
        await stopPreview();
      }
    } else {
      // Video: rewind to 0 and play. The Video component is rendered
      // inline in the preview card; the ref points at it.
      try {
        await previewVideoRef.current?.setPositionAsync(0);
        await previewVideoRef.current?.playAsync();
      } catch {
        await stopPreview();
      }
    }
  };

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

        <View style={styles.menuButton}>
          <ContentMenu
            entityType="quest"
            entityId={quest.id}
            entityLabel={quest.title}
            authorId={quest.authorId || undefined}
            authorName={quest.authorUsername}
            onBlocked={() => router.back()}
          />
        </View>

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
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Format</Text>
                <Text style={styles.detailValue}>
                  {quest.mediaType === 'video'
                    ? '🎬 Video'
                    : quest.mediaType === 'audio'
                      ? '🎧 Audio only'
                      : '—'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={Typography.headerMedium}>Starting Location</Text>
            {quest.firstWaypointLocation.latitude !== 0 ||
            quest.firstWaypointLocation.longitude !== 0 ? (
              <View style={styles.mapPreview}>
                <MapView
                  style={StyleSheet.absoluteFill}
                  initialRegion={{
                    latitude: quest.firstWaypointLocation.latitude,
                    longitude: quest.firstWaypointLocation.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }}
                  pointerEvents="none"
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                >
                  <Marker
                    coordinate={{
                      latitude: quest.firstWaypointLocation.latitude,
                      longitude: quest.firstWaypointLocation.longitude,
                    }}
                    title={quest.waypoints?.[0]?.title || 'Starting waypoint'}
                    pinColor={Colors.accentYellow}
                  />
                </MapView>
              </View>
            ) : (
              <View style={[styles.mapPreview, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 30 }}>📍</Text>
                <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: Spacing.sm }]}>
                  Location not set
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={Typography.headerMedium}>Preview</Text>
            {previewMedia ? (
              <TouchableOpacity
                style={styles.previewPlayer}
                onPress={startPreview}
                activeOpacity={0.85}
              >
                {/* Video player rendered behind the controls so the user
                    sees moving video while the preview plays. Audio
                    previews show only the controls. */}
                {previewMedia.type === 'video' && (
                  <Video
                    ref={previewVideoRef}
                    source={{ uri: previewMedia.url }}
                    style={StyleSheet.absoluteFill}
                    resizeMode={ResizeMode.COVER}
                    isMuted={false}
                    posterSource={quest.coverImageUrl ? { uri: quest.coverImageUrl } : undefined}
                    usePoster={!!quest.coverImageUrl}
                    posterStyle={{ resizeMode: 'cover' }}
                  />
                )}
                <View style={styles.previewOverlay}>
                  <Text style={{ fontSize: 40 }}>{isPreviewPlaying ? '⏸' : '▶️'}</Text>
                  <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: Spacing.sm }]}>
                    {isPreviewPlaying
                      ? `Playing… ${Math.max(0, Math.ceil(10 - previewProgress * 10))}s left`
                      : '10 second preview'}
                  </Text>
                </View>
                <View style={styles.previewProgressBar}>
                  <View
                    style={[styles.previewProgressFill, { width: `${previewProgress * 100}%` }]}
                  />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={[styles.previewPlayer, { opacity: 0.5 }]}>
                <Text style={{ fontSize: 40 }}>🎧</Text>
                <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: Spacing.sm }]}>
                  No preview available yet
                </Text>
              </View>
            )}
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
  menuButton: {
    position: 'absolute',
    top: 50,
    right: Spacing.lg,
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
    height: 160,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  previewPlayer: {
    height: 160,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    position: 'relative',
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  previewProgressBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  previewProgressFill: {
    height: '100%',
    backgroundColor: Colors.accentYellow,
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
