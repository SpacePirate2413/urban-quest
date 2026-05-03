import { Audio, ResizeMode, Video } from 'expo-av';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
  ImageBackground,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { useInterstitial } from '@/src/hooks/useInterstitial';
import { api } from '@/src/services/api';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';

// Arrival radius is wider than the previous 15m to absorb GPS jitter on real
// devices (~5–10m). Bumping to 25m makes the "you've arrived" trigger stable.
const ARRIVAL_RADIUS_METERS = 25;

// Sentinel value for choice.sceneId that means "the quest ends here".
// Must stay in lockstep with END_SCENE_ID in apps/api/src/features/quests/quests.service.ts
// and the creator-station's End-Quest dropdown option.
const END_SCENE_ID = '__END__';

// Strip the trailing /api so we can prefix relative scene mediaUrl values
// (the API stores them as `/api/media/scene-...mp3`).
const API_HOST = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '');

type Coord = { latitude: number; longitude: number };
// Choices route by `sceneId` so creators can branch to a specific scene even
// when two scenes share a physical waypoint. Legacy data uses `waypointId`;
// parsePlayableQuest migrates that on read.
type Choice = { text: string; sceneId: string };
type Waypoint = { id: string; name: string; notes?: string; lat: number; lng: number; orderIndex: number };
type Scene = {
  id: string;
  waypointId: string;
  script: string;
  question: string;
  choices: Choice[];
  mediaUrl: string | null;
  mediaType: 'audio' | 'video' | null;
  orderIndex: number;
};
type PlayableQuest = {
  id: string;
  title: string;
  isFree: boolean;
  /** Quest cover image (full URL). Used as the background visual for
   *  audio-only scenes and as a poster while video scenes buffer. */
  coverImageUrl: string | null;
  waypoints: Waypoint[];
  scenes: Scene[];
  sceneById: Map<string, Scene>;
  firstScene: Scene;
};

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function haversineMeters(a: Coord, b: Coord): number {
  const R = 6_371_000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function fullMediaUrl(rel: string | null): string | null {
  if (!rel) return null;
  if (/^https?:\/\//.test(rel)) return rel;
  return `${API_HOST}${rel.startsWith('/') ? rel : `/${rel}`}`;
}

/**
 * Parse the API quest payload into our internal PlayableQuest shape, or
 * return a string error if the quest is missing data needed to play it.
 * This is the same constraint the API enforces in `isQuestPlayable`, but we
 * re-check on the client so a stale cached quest doesn't crash the player.
 */
function parsePlayableQuest(data: any): PlayableQuest | string {
  if (!data?.waypoints?.length) return 'This quest has no waypoints.';
  if (!data?.scenes?.length) return 'This quest has no scenes.';

  const waypoints: Waypoint[] = data.waypoints
    .map((wp: any, i: number) => ({
      id: wp.id,
      name: wp.name || `Waypoint ${i + 1}`,
      notes: wp.notes ?? undefined,
      lat: Number(wp.lat),
      lng: Number(wp.lng),
      orderIndex: typeof wp.orderIndex === 'number' ? wp.orderIndex : i,
    }))
    .sort((a: Waypoint, b: Waypoint) => a.orderIndex - b.orderIndex);

  // Pre-pass: collect raw scenes so we can build the legacy waypoint→scene
  // fallback used to migrate old `choice.waypointId` values to `sceneId`.
  const rawScenes = (data.scenes as any[])
    .slice()
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  const sceneIds = new Set(rawScenes.map((s) => s.id));
  const firstSceneIdAtWaypoint = new Map<string, string>();
  for (const s of rawScenes) {
    if (s.waypointId && !firstSceneIdAtWaypoint.has(s.waypointId)) {
      firstSceneIdAtWaypoint.set(s.waypointId, s.id);
    }
  }

  const scenes: Scene[] = [];
  for (const s of rawScenes) {
    // Script is optional — see isQuestPlayable in apps/api. Media is the gate.
    if (!s.question?.trim() || !s.mediaUrl || !s.waypointId) {
      return 'This quest is missing scene data.';
    }
    let rawChoices: { text?: string; sceneId?: string; waypointId?: string }[];
    try {
      rawChoices = JSON.parse(s.choices ?? '[]');
    } catch {
      return 'This quest has malformed choices.';
    }
    if (!Array.isArray(rawChoices) || rawChoices.length === 0) {
      return 'This quest is missing choices.';
    }
    const migratedChoices: Choice[] = [];
    for (const c of rawChoices) {
      if (!c?.text?.trim()) return 'This quest has an empty choice.';
      // Prefer the new sceneId; fall back to legacy waypointId by routing to
      // the first scene at that waypoint (matches Option A from 2026-04-29).
      let target = c.sceneId ?? c.waypointId ?? '';
      if (target !== END_SCENE_ID && !sceneIds.has(target)) {
        const fromLegacy = firstSceneIdAtWaypoint.get(target);
        if (fromLegacy) target = fromLegacy;
      }
      if (target !== END_SCENE_ID && !sceneIds.has(target)) {
        return 'This quest has a choice that points nowhere.';
      }
      migratedChoices.push({ text: c.text, sceneId: target });
    }
    scenes.push({
      id: s.id,
      waypointId: s.waypointId,
      script: s.script ?? '',
      question: s.question,
      choices: migratedChoices,
      mediaUrl: fullMediaUrl(s.mediaUrl),
      mediaType: (s.mediaType as 'audio' | 'video' | null) ?? null,
      orderIndex: typeof s.orderIndex === 'number' ? s.orderIndex : 0,
    });
  }

  const sceneById = new Map<string, Scene>();
  for (const s of scenes) sceneById.set(s.id, s);

  // First scene = lowest-orderIndex scene overall. With multiple scenes per
  // waypoint allowed, the entry point can't be inferred from waypoint order
  // alone — the creator's scene order is the source of truth.
  const firstScene = scenes[0];

  // Cover image is stored as either a full URL (https://...) or as a
  // base64 data URI (legacy creator-station path). Both work directly as
  // an Image source, so we just normalize to string|null.
  const coverImageUrl: string | null = data.coverImage
    ? /^https?:\/\/|^data:/.test(data.coverImage)
      ? data.coverImage
      : `${API_HOST}${String(data.coverImage).startsWith('/') ? data.coverImage : `/${data.coverImage}`}`
    : null;

  return {
    id: data.id,
    title: data.title,
    isFree: (data.price ?? 0) === 0,
    coverImageUrl,
    waypoints,
    scenes,
    sceneById,
    firstScene,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Navigation phase — shows a real map, the player's blue dot, the destination
// pin, distance from real GPS, and a "▶ Simulate Arrival" button in __DEV__.
// ─────────────────────────────────────────────────────────────────────────

type NavViewProps = {
  destination: Waypoint;
  currentLocation: Coord | null;
  permissionDenied: boolean;
  onArrived: () => void;
};

function NavigationView({ destination, currentLocation, permissionDenied, onArrived }: NavViewProps) {
  const distanceMeters = currentLocation
    ? haversineMeters(currentLocation, { latitude: destination.lat, longitude: destination.lng })
    : null;

  const distanceLabel = distanceMeters == null
    ? '—'
    : distanceMeters < 1000
    ? `${Math.round(distanceMeters)}m`
    : `${(distanceMeters / 1000).toFixed(1)}km`;

  const arrived = distanceMeters != null && distanceMeters <= ARRIVAL_RADIUS_METERS;

  // Auto-trigger arrival once when we cross the threshold. Guarded so we don't
  // spam onArrived if GPS jitters in/out of the radius.
  const firedRef = useRef(false);
  useEffect(() => {
    if (arrived && !firedRef.current) {
      firedRef.current = true;
      onArrived();
    }
  }, [arrived, onArrived]);

  const initialRegion = {
    latitude: destination.lat,
    longitude: destination.lng,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const openInMaps = () => {
    const lat = destination.lat;
    const lng = destination.lng;
    const url = Platform.select({
      ios: `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`,
      android: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`,
    })!;
    Linking.openURL(url);
  };

  return (
    <View style={styles.navigationView}>
      <View style={styles.mapContainer}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={false}
          followsUserLocation={false}
        >
          <Marker
            coordinate={{ latitude: destination.lat, longitude: destination.lng }}
            title={destination.name}
            description={destination.description}
            pinColor={Colors.accentYellow}
          />
        </MapView>
      </View>

      <View style={styles.waypointInfo}>
        <Text style={Typography.headerMedium}>{destination.name}</Text>
        {destination.description ? (
          <Text style={[Typography.body, { color: Colors.textSecondary, marginTop: Spacing.xs }]}>
            {destination.description}
          </Text>
        ) : null}
      </View>

      <View style={styles.distanceCard}>
        <Text style={styles.distanceValue}>{distanceLabel}</Text>
        <Text style={styles.distanceLabel}>
          {permissionDenied
            ? 'Location permission needed'
            : currentLocation == null
            ? 'Locating you…'
            : 'to destination'}
        </Text>
      </View>

      <TouchableOpacity style={styles.mapsButton} onPress={openInMaps}>
        <Text style={styles.mapsButtonIcon}>🧭</Text>
        <Text style={styles.mapsButtonText}>Open in Maps</Text>
      </TouchableOpacity>

      {/* Dev-only fast-forward so we don't have to walk during testing.
           Stripped from production builds where __DEV__ is false. */}
      {__DEV__ && (
        <TouchableOpacity
          style={styles.simulateButton}
          onPress={() => {
            firedRef.current = true;
            onArrived();
          }}
        >
          <Text style={styles.simulateButtonText}>▶  DEV: Simulate Arrival</Text>
        </TouchableOpacity>
      )}

      {arrived && (
        <View style={styles.arrivedBanner}>
          <Text style={{ fontSize: 30 }}>🎉</Text>
          <Text style={[Typography.headerMedium, { marginTop: Spacing.sm }]}>You&apos;ve Arrived!</Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Scene phase — plays the scene's audio or video via expo-av. Falls back to
// a "Continue" button if media never loads (network glitch, etc).
// ─────────────────────────────────────────────────────────────────────────

function ScenePlayer({
  scene,
  coverImageUrl,
  onComplete,
}: {
  scene: Scene;
  coverImageUrl: string | null;
  onComplete: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [finished, setFinished] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const videoRef = useRef<Video | null>(null);

  // Audio playback. Configure the audio session once so the scene plays
  // even when the phone's silent switch is on (location-based storytelling
  // is useless if the audio is muted by default).
  useEffect(() => {
    if (scene.mediaType !== 'audio' || !scene.mediaUrl) return;
    let cancelled = false;

    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        const { sound } = await Audio.Sound.createAsync(
          { uri: scene.mediaUrl! },
          { shouldPlay: false },
          (status) => {
            if (!status.isLoaded) return;
            if (cancelled) return;
            const dur = status.durationMillis ?? 0;
            const pos = status.positionMillis ?? 0;
            setProgress(dur ? Math.min(100, (pos / dur) * 100) : 0);
            if (status.didJustFinish) {
              setFinished(true);
              setIsPlaying(false);
            }
          },
        );
        if (cancelled) {
          await sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
      } catch {
        // If audio fails to load, fall through to the Continue button so
        // the player can still progress.
        setFinished(true);
      }
    })();

    return () => {
      cancelled = true;
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, [scene.mediaUrl, scene.mediaType]);

  const togglePlay = async () => {
    if (scene.mediaType === 'audio') {
      const sound = soundRef.current;
      if (!sound) return;
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } else if (scene.mediaType === 'video') {
      const v = videoRef.current;
      if (!v) return;
      if (isPlaying) {
        await v.pauseAsync();
        setIsPlaying(false);
      } else {
        await v.playAsync();
        setIsPlaying(true);
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scenePlayer}>
      <View style={styles.playerContainer}>
        {scene.mediaType === 'video' && scene.mediaUrl ? (
          <Video
            ref={videoRef}
            source={{ uri: scene.mediaUrl }}
            style={StyleSheet.absoluteFill}
            useNativeControls
            // Show the quest cover as a poster while the video loads —
            // gives the player something cinematic to look at instead of
            // a black box during buffering.
            usePoster={!!coverImageUrl}
            posterSource={coverImageUrl ? { uri: coverImageUrl } : undefined}
            posterStyle={{ resizeMode: 'cover' }}
            resizeMode={ResizeMode.CONTAIN}
            onPlaybackStatusUpdate={(status) => {
              if (!status.isLoaded) return;
              const dur = status.durationMillis ?? 0;
              const pos = status.positionMillis ?? 0;
              setProgress(dur ? Math.min(100, (pos / dur) * 100) : 0);
              setIsPlaying(status.isPlaying);
              if (status.didJustFinish) setFinished(true);
            }}
          />
        ) : coverImageUrl && scene.mediaType === 'audio' ? (
          // Audio scene + quest has cover art → full-bleed background with
          // a dark gradient over the bottom so the play button + progress
          // bar stay readable on top of any image.
          <ImageBackground
            source={{ uri: coverImageUrl }}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
          >
            <View style={styles.audioGradient} pointerEvents="none" />
          </ImageBackground>
        ) : (
          <View style={styles.audioPlaceholder}>
            <Text style={{ fontSize: 60 }}>{scene.mediaType === 'audio' ? '🎧' : '🎬'}</Text>
          </View>
        )}

        {/* Show the custom play button for both audio and video. Video also
            has expo-av's useNativeControls overlay, but that only appears
            after the user taps the video — without this button there's no
            visible "play" affordance until they figure that out. */}
        {(scene.mediaType === 'audio' || scene.mediaType === 'video') && (
          <TouchableOpacity style={styles.playButton} onPress={togglePlay}>
            <Text style={styles.playButtonText}>{isPlaying ? '⏸' : '▶️'}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {scene.script.trim() ? (
        <View style={styles.scriptContainer}>
          <Text style={Typography.screenplay}>{scene.script}</Text>
        </View>
      ) : null}

      {(finished || progress >= 99) && (
        <TouchableOpacity style={styles.continueButton} onPress={onComplete}>
          <Text style={styles.continueButtonText}>Continue →</Text>
        </TouchableOpacity>
      )}

      {/* Skip option for dev so we can iterate fast without listening to
           every scene end-to-end. */}
      {__DEV__ && !finished && (
        <TouchableOpacity style={[styles.continueButton, { marginTop: Spacing.sm, opacity: 0.7 }]} onPress={onComplete}>
          <Text style={styles.continueButtonText}>DEV: Skip Scene →</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Question phase — renders the scene's question + each choice as a button.
// Tapping a choice routes back to PlayScreen, which decides what's next.
// ─────────────────────────────────────────────────────────────────────────

function QuestionView({ scene, onChoose }: { scene: Scene; onChoose: (choice: Choice) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.questionView}>
      <Text style={Typography.headerMedium}>{scene.question}</Text>
      <View style={styles.choicesContainer}>
        {scene.choices.map((choice, i) => {
          const isEnd = choice.sceneId === END_SCENE_ID;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.choiceButton, isEnd && styles.choiceEnd]}
              onPress={() => onChoose(choice)}
            >
              <Text style={[styles.choiceText, isEnd && styles.choiceEndText]}>
                {isEnd ? `🏁 ${choice.text}` : choice.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Completion screen — real review submission. 1–5 stars, optional comment,
// Submit posts via api.submitReview, Skip just goes home.
// ─────────────────────────────────────────────────────────────────────────

function CompletionScreen({
  quest,
  startedAt,
  visitedCount,
}: {
  quest: PlayableQuest;
  startedAt: Date;
  visitedCount: number;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const elapsedMs = Date.now() - startedAt.getTime();
  const elapsedMinutes = Math.round(elapsedMs / 60000);
  const elapsedDisplay = elapsedMinutes < 1 ? '< 1 min' : `${elapsedMinutes} min`;

  const submit = async () => {
    if (rating < 1) {
      Alert.alert('Pick a rating', 'Tap one to five stars before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      await api.submitReview(quest.id, rating, comment.trim() || undefined);
      setSubmitted(true);
      // Brief confirmation, then send the player home.
      setTimeout(() => router.replace('/(tabs)'), 1200);
    } catch (err: any) {
      Alert.alert('Could not submit review', err?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.completionScreen} contentContainerStyle={styles.completionContent}>
      <View style={styles.completionHeader}>
        <Text style={{ fontSize: 60 }}>🎉</Text>
        <Text style={[Typography.headerLarge, { marginTop: Spacing.md }]}>QUEST COMPLETE!</Text>
        <Text style={[Typography.body, { color: Colors.textSecondary, marginTop: Spacing.sm }]}>
          Congratulations, adventurer!
        </Text>
      </View>

      <View style={styles.statsCard}>
        <Text style={Typography.headerMedium}>Your Journey</Text>
        <View style={styles.statRow}>
          <Text style={Typography.body}>Quest</Text>
          <Text style={[Typography.body, { color: Colors.accentYellow }]}>{quest.title}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={Typography.body}>Waypoints Visited</Text>
          <Text style={[Typography.body, { color: Colors.accentYellow }]}>{visitedCount}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={Typography.body}>Time Taken</Text>
          <Text style={[Typography.body, { color: Colors.accentYellow }]}>{elapsedDisplay}</Text>
        </View>
      </View>

      <View style={styles.ratingSection}>
        <Text style={Typography.headerMedium}>Rate this quest</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)} disabled={submitted}>
              <Text style={[styles.star, rating >= star && styles.starActive]}>⭐</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.commentInput}
          value={comment}
          onChangeText={setComment}
          placeholder="Add an optional review (max 500 chars)"
          placeholderTextColor={Colors.textSecondary}
          multiline
          maxLength={500}
          editable={!submitted}
        />
      </View>

      {submitted ? (
        <View style={[styles.shareButton, { backgroundColor: Colors.success }]}>
          <Text style={styles.shareButtonIcon}>✓</Text>
          <Text style={styles.shareButtonText}>Review submitted</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.shareButton} onPress={submit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color={Colors.primaryBackground} />
          ) : (
            <>
              <Text style={styles.shareButtonIcon}>📝</Text>
              <Text style={styles.shareButtonText}>Submit Review</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.homeButton} onPress={() => router.replace('/(tabs)')} disabled={submitting}>
        <Text style={styles.homeButtonText}>{submitted ? 'Back to Home' : 'Skip & Go Home'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Top-level play screen — orchestrates phase, GPS subscription, scene
// branching from choices, ad gating, and completion.
// ─────────────────────────────────────────────────────────────────────────

type Phase = 'navigate' | 'scene' | 'question' | 'complete';

export default function PlayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [quest, setQuest] = useState<PlayableQuest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  const [phase, setPhase] = useState<Phase>('navigate');
  const [visitedSceneIds, setVisitedSceneIds] = useState<Set<string>>(new Set());

  const [currentLocation, setCurrentLocation] = useState<Coord | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [resuming, setResuming] = useState(false);

  const { maybeShowAdAtSceneBoundary } = useInterstitial();
  const [startedAt] = useState(new Date());

  // ── 1. Load + parse the quest ─────────────────────────────────────────
  useEffect(() => {
    if (!id) {
      setError('No quest id provided.');
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .getQuest(id)
      .then((data: any) => {
        const parsed = parsePlayableQuest(data);
        if (typeof parsed === 'string') {
          setError(parsed);
        } else {
          setQuest(parsed);
          setCurrentScene(parsed.firstScene);
          setVisitedSceneIds(new Set([parsed.firstScene.id]));
        }
      })
      .catch((err: any) => setError(err?.message ?? 'Failed to load quest'))
      .finally(() => setLoading(false));
  }, [id]);

  // ── 2. Foreground GPS subscription ────────────────────────────────────
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const existing = await Location.getForegroundPermissionsAsync();
      let status = existing.status;
      if (status === Location.PermissionStatus.UNDETERMINED) {
        const requested = await Location.requestForegroundPermissionsAsync();
        status = requested.status;
      }
      if (cancelled) return;
      if (status !== Location.PermissionStatus.GRANTED) {
        setPermissionDenied(true);
        return;
      }
      // Tighter polling than the global useLocationTracking hook because
      // arrival detection needs ~5m granularity.
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 5, timeInterval: 2000 },
        (loc) => {
          setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        },
      );
    })().catch(() => {
      if (!cancelled) setPermissionDenied(true);
    });

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  // ── 3. AppState — show "Welcome back" splash on re-foreground ─────────
  useEffect(() => {
    const handleChange = (next: AppStateStatus) => {
      if (next === 'active') {
        setResuming(true);
        // Give the location subscription a chance to fire one update.
        setTimeout(() => setResuming(false), 1500);
      }
    };
    const sub = AppState.addEventListener('change', handleChange);
    return () => sub.remove();
  }, []);

  // ── 4. Phase transitions ──────────────────────────────────────────────
  const handleArrived = useCallback(() => {
    setPhase('scene');
  }, []);

  const handleSceneComplete = useCallback(() => {
    setPhase('question');
  }, []);

  const handleChoose = useCallback(
    async (choice: Choice) => {
      if (!quest || !currentScene) return;

      if (choice.sceneId === END_SCENE_ID) {
        setPhase('complete');
        api.updateProgress(quest.id, { completed: true }).catch(() => {});
        return;
      }

      const nextScene = quest.sceneById.get(choice.sceneId);
      if (!nextScene) {
        // Should be impossible because parsePlayableQuest validated this,
        // but bail to completion rather than crashing if it ever happens.
        setPhase('complete');
        return;
      }

      // Free-quest interstitial check at scene boundary. Awaits the ad's
      // close so we don't navigate to the next waypoint behind the ad.
      if (quest.isFree) {
        await maybeShowAdAtSceneBoundary();
      }

      setVisitedSceneIds((s) => new Set(s).add(nextScene.id));
      setCurrentScene(nextScene);
      setPhase('navigate');
      api.updateProgress(quest.id, { currentSceneId: nextScene.id }).catch(() => {});
    },
    [quest, currentScene, maybeShowAdAtSceneBoundary],
  );

  // ── 5. Render ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[AppStyles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.cyan} />
        <Text style={[Typography.body, { color: Colors.textSecondary, marginTop: Spacing.md }]}>
          Loading quest…
        </Text>
      </View>
    );
  }

  if (error || !quest || !currentScene) {
    return (
      <View style={[AppStyles.container, styles.centered, { padding: Spacing.lg }]}>
        <Text style={{ fontSize: 40 }}>❌</Text>
        <Text style={[Typography.headerMedium, { marginTop: Spacing.md }]}>Can&apos;t Play This Quest</Text>
        <Text style={[Typography.body, { color: Colors.textSecondary, marginTop: Spacing.sm, textAlign: 'center' }]}>
          {error ?? 'Could not load this quest.'}
        </Text>
        <TouchableOpacity style={styles.homeReturnButton} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.homeReturnButtonText}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === 'complete') {
    return <CompletionScreen quest={quest} startedAt={startedAt} visitedCount={visitedSceneIds.size} />;
  }

  const destinationWaypoint = quest.waypoints.find((w) => w.id === currentScene.waypointId)!;

  return (
    <View style={AppStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Exit</Text>
        </TouchableOpacity>
        {/* Progress is intentionally not "Waypoint X of Y" — branching means we
            don't know how many remain. Show the current scene's location instead. */}
        <Text style={[Typography.caption, { color: Colors.textSecondary, flex: 1, textAlign: 'right' }]} numberOfLines={1}>
          {destinationWaypoint.name}
        </Text>
      </View>

      {phase === 'navigate' && (
        <NavigationView
          destination={destinationWaypoint}
          currentLocation={currentLocation}
          permissionDenied={permissionDenied}
          onArrived={handleArrived}
        />
      )}

      {phase === 'scene' && (
        <ScenePlayer
          scene={currentScene}
          coverImageUrl={quest.coverImageUrl}
          onComplete={handleSceneComplete}
        />
      )}

      {phase === 'question' && <QuestionView scene={currentScene} onChoose={handleChoose} />}

      {resuming && (
        <View style={styles.resumeOverlay}>
          <ActivityIndicator size="large" color={Colors.cyan} />
          <Text style={[Typography.headerMedium, { marginTop: Spacing.md }]}>Welcome back</Text>
          <Text style={[Typography.body, { color: Colors.textSecondary, marginTop: Spacing.xs }]}>
            Checking your location…
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingTop: 60,
    gap: Spacing.md,
  },
  backButton: { color: Colors.accentRed, fontSize: 16, fontWeight: '600' },
  navigationView: { flex: 1, padding: Spacing.lg },
  mapContainer: {
    flex: 1,
    minHeight: 240,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  waypointInfo: { marginTop: Spacing.lg },
  distanceCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.accentYellow,
  },
  distanceValue: { fontSize: 36, fontWeight: '700', color: Colors.accentYellow },
  distanceLabel: { color: Colors.textSecondary, marginTop: 4 },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 12,
    marginTop: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  mapsButtonIcon: { fontSize: 20 },
  mapsButtonText: { color: Colors.textPrimary, fontWeight: '600' },
  simulateButton: {
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderRadius: 8,
    marginTop: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cyan,
    borderStyle: 'dashed',
  },
  simulateButtonText: { color: Colors.cyan, fontWeight: '600', fontSize: 13 },
  arrivedBanner: {
    position: 'absolute',
    bottom: 100,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.success,
    padding: Spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
  },
  scenePlayer: { padding: Spacing.lg, paddingBottom: 40 },
  playerContainer: {
    height: 280,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  audioPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', alignSelf: 'stretch' },
  // Subtle dark fade across the bottom 50% so the play button + progress
  // bar stay readable on top of bright cover-image backgrounds. Pure
  // semi-transparent overlay — no native gradient lib required.
  audioGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  playButton: {
    position: 'absolute',
    width: 80,
    height: 80,
    backgroundColor: Colors.accentYellow,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: { fontSize: 30 },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: Colors.border,
  },
  progressFill: { height: '100%', backgroundColor: Colors.accentYellow },
  scriptContainer: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: 12,
    marginTop: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  continueButton: {
    backgroundColor: Colors.accentYellow,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  continueButtonText: { color: Colors.primaryBackground, fontWeight: '700', fontSize: 16 },
  questionView: { padding: Spacing.lg, paddingTop: Spacing.xl },
  choicesContainer: { marginTop: Spacing.xl, gap: Spacing.md },
  choiceButton: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  choiceText: { color: Colors.textPrimary, fontSize: 16 },
  choiceEnd: { borderColor: Colors.accentYellow, backgroundColor: Colors.surface },
  choiceEndText: { color: Colors.accentYellow, fontWeight: '700' },
  completionScreen: { flex: 1, backgroundColor: Colors.primaryBackground },
  completionContent: { padding: Spacing.lg, paddingTop: 80, paddingBottom: 40 },
  completionHeader: { alignItems: 'center', marginBottom: Spacing.xl },
  statsCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: 16,
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  ratingSection: { alignItems: 'center', marginBottom: Spacing.lg },
  starsContainer: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  star: { fontSize: 36, opacity: 0.3 },
  starActive: { opacity: 1 },
  commentInput: {
    width: '100%',
    minHeight: 80,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    padding: Spacing.md,
    marginTop: Spacing.md,
    textAlignVertical: 'top',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentCyan,
    padding: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  shareButtonIcon: { fontSize: 20 },
  shareButtonText: { color: Colors.primaryBackground, fontWeight: '700', fontSize: 16 },
  homeButton: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  homeButtonText: { color: Colors.textPrimary, fontWeight: '600', fontSize: 16 },
  homeReturnButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.cyan,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  homeReturnButtonText: { color: Colors.primaryBackground, fontWeight: '700', fontSize: 16 },
  resumeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
