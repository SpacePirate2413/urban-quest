import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Linking, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';
import { usePlaybackStore, useQuestStore } from '@/src/store';
import { MOCK_QUESTS } from '@/src/data/mockData';
import { Waypoint, Scene, Question, Choice } from '@/src/types';

function NavigationView({ waypoint, onArrived }: { waypoint: Waypoint; onArrived: () => void }) {
  const [distance, setDistance] = useState(150);

  useEffect(() => {
    const interval = setInterval(() => {
      setDistance((d) => {
        const newDistance = Math.max(0, d - Math.random() * 20);
        if (newDistance <= 15) {
          clearInterval(interval);
          onArrived();
        }
        return newDistance;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const openMaps = () => {
    const url = `https://maps.apple.com/?daddr=${waypoint.location.latitude},${waypoint.location.longitude}&dirflg=w`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.navigationView}>
      <View style={styles.mapPlaceholder}>
        <Text style={{ fontSize: 50 }}>🗺️</Text>
        <View style={styles.routeLine} />
        <View style={styles.destinationPin}>
          <Text style={{ fontSize: 30 }}>📍</Text>
        </View>
        <View style={styles.currentLocation}>
          <Text style={{ fontSize: 20 }}>🔵</Text>
        </View>
      </View>

      <View style={styles.waypointInfo}>
        <Text style={Typography.headerMedium}>{waypoint.title}</Text>
        <Text style={[Typography.body, { color: Colors.textSecondary, marginTop: Spacing.xs }]}>
          {waypoint.description}
        </Text>
      </View>

      <View style={styles.distanceCard}>
        <Text style={styles.distanceValue}>{Math.round(distance)}m</Text>
        <Text style={styles.distanceLabel}>to destination</Text>
      </View>

      <TouchableOpacity style={styles.mapsButton} onPress={openMaps}>
        <Text style={styles.mapsButtonIcon}>🧭</Text>
        <Text style={styles.mapsButtonText}>Open in Maps</Text>
      </TouchableOpacity>

      {distance <= 15 && (
        <View style={styles.arrivedBanner}>
          <Text style={{ fontSize: 30 }}>🎉</Text>
          <Text style={[Typography.headerMedium, { marginTop: Spacing.sm }]}>You've Arrived!</Text>
          <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
            Tap to play the scene
          </Text>
        </View>
      )}
    </View>
  );
}

function ScenePlayer({ scene, onComplete, isFreeQuest }: { scene: Scene; onComplete: () => void; isFreeQuest: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [adTimer, setAdTimer] = useState(30);

  useEffect(() => {
    if (isPlaying && progress < 100) {
      const interval = setInterval(() => {
        setProgress((p) => Math.min(100, p + 10));
      }, 500);
      return () => clearInterval(interval);
    }
    if (progress >= 100 && isFreeQuest) {
      setShowAd(true);
    }
  }, [isPlaying, progress]);

  useEffect(() => {
    if (showAd && adTimer > 0) {
      const interval = setInterval(() => {
        setAdTimer((t) => t - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showAd, adTimer]);

  const handleAdComplete = () => {
    setShowAd(false);
    onComplete();
  };

  if (showAd) {
    return (
      <View style={styles.adContainer}>
        <View style={styles.adContent}>
          <Text style={{ fontSize: 40 }}>📺</Text>
          <Text style={[Typography.headerMedium, { marginTop: Spacing.md }]}>Advertisement</Text>
          <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: Spacing.sm }]}>
            Supporting free quests
          </Text>
          <View style={styles.adTimer}>
            <Text style={styles.adTimerText}>
              {adTimer > 0 ? `Skip in ${adTimer}s` : 'Skip Ad →'}
            </Text>
          </View>
        </View>
        {adTimer <= 0 && (
          <TouchableOpacity style={styles.skipAdButton} onPress={handleAdComplete}>
            <Text style={styles.skipAdText}>Skip Ad →</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.scenePlayer}>
      <View style={styles.playerContainer}>
        {scene.videoUrl ? (
          <View style={styles.videoPlaceholder}>
            <Text style={{ fontSize: 60 }}>🎬</Text>
          </View>
        ) : (
          <View style={styles.audioPlaceholder}>
            <Text style={{ fontSize: 60 }}>🎧</Text>
          </View>
        )}

        {!isPlaying ? (
          <TouchableOpacity style={styles.playButton} onPress={() => setIsPlaying(true)}>
            <Text style={styles.playButtonText}>▶️</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        )}
      </View>

      <View style={styles.scriptContainer}>
        {scene.speaker && (
          <Text style={[Typography.caption, { color: Colors.accentYellow }]}>{scene.speaker}</Text>
        )}
        <Text style={Typography.screenplay}>{scene.scriptText}</Text>
      </View>

      {progress >= 100 && !isFreeQuest && (
        <TouchableOpacity style={styles.continueButton} onPress={onComplete}>
          <Text style={styles.continueButtonText}>Continue →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function QuestionView({ question, onAnswer }: { question: Question; onAnswer: (choice: Choice) => void }) {
  return (
    <View style={styles.questionView}>
      <Text style={Typography.headerMedium}>{question.text}</Text>
      <View style={styles.choicesContainer}>
        {question.choices.map((choice) => (
          <TouchableOpacity
            key={choice.id}
            style={styles.choiceButton}
            onPress={() => onAnswer(choice)}
          >
            <Text style={styles.choiceText}>{choice.text}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function CompletionScreen({ quest, onShare, onReview }: { quest: any; onShare: () => void; onReview: () => void }) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

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
          <Text style={[Typography.body, { color: Colors.accentYellow }]}>{quest.waypoints.length}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={Typography.body}>Time Taken</Text>
          <Text style={[Typography.body, { color: Colors.accentYellow }]}>32 min</Text>
        </View>
      </View>

      <View style={styles.ratingSection}>
        <Text style={Typography.headerMedium}>Rate This Quest</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <Text style={[styles.star, rating >= star && styles.starActive]}>⭐</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.shareButton} onPress={onShare}>
        <Text style={styles.shareButtonIcon}>📤</Text>
        <Text style={styles.shareButtonText}>Share to Social Media</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.homeButton} onPress={() => router.replace('/(tabs)')}>
        <Text style={styles.homeButtonText}>Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

export default function PlayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const quest = MOCK_QUESTS.find((q) => q.id === id) || MOCK_QUESTS[0];
  
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(0);
  const [phase, setPhase] = useState<'navigate' | 'scene' | 'question' | 'complete'>('navigate');
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const currentWaypoint = quest.waypoints[currentWaypointIndex];
  const currentScene = currentWaypoint?.scenes?.[currentSceneIndex];
  const currentQuestion = currentScene?.questions?.[currentQuestionIndex];

  const handleArrived = () => {
    Alert.alert('🎉 You\'ve Arrived!', 'Tap OK to play the scene.', [
      { text: 'OK', onPress: () => setPhase('scene') },
    ]);
  };

  const handleSceneComplete = () => {
    if (currentScene?.questions?.length > 0) {
      setPhase('question');
    } else {
      moveToNextWaypoint();
    }
  };

  const handleAnswer = (choice: Choice) => {
    if (currentQuestionIndex < (currentScene?.questions?.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      moveToNextWaypoint();
    }
  };

  const moveToNextWaypoint = () => {
    if (currentWaypointIndex < quest.waypoints.length - 1) {
      setCurrentWaypointIndex(currentWaypointIndex + 1);
      setCurrentSceneIndex(0);
      setCurrentQuestionIndex(0);
      setPhase('navigate');
    } else {
      setPhase('complete');
    }
  };

  const handleShare = () => {
    Alert.alert('Share', 'Sharing to social media...');
  };

  const handleReview = () => {
    Alert.alert('Review', 'Thank you for your review!');
  };

  if (phase === 'complete') {
    return <CompletionScreen quest={quest} onShare={handleShare} onReview={handleReview} />;
  }

  return (
    <View style={AppStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Exit</Text>
        </TouchableOpacity>
        <View style={styles.progressIndicator}>
          <Text style={Typography.caption}>
            Waypoint {currentWaypointIndex + 1} of {quest.waypoints.length}
          </Text>
          <View style={styles.progressDots}>
            {quest.waypoints.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i <= currentWaypointIndex && styles.progressDotActive,
                ]}
              />
            ))}
          </View>
        </View>
      </View>

      {phase === 'navigate' && currentWaypoint && (
        <NavigationView waypoint={currentWaypoint} onArrived={handleArrived} />
      )}

      {phase === 'scene' && currentScene && (
        <ScenePlayer scene={currentScene} onComplete={handleSceneComplete} isFreeQuest={quest.isFree} />
      )}

      {phase === 'question' && currentQuestion && (
        <QuestionView question={currentQuestion} onAnswer={handleAnswer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingTop: 60,
  },
  backButton: {
    color: Colors.accentRed,
    fontSize: 16,
    fontWeight: '600',
  },
  progressIndicator: {
    alignItems: 'flex-end',
  },
  progressDots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  progressDotActive: {
    backgroundColor: Colors.accentYellow,
  },
  navigationView: {
    flex: 1,
    padding: Spacing.lg,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    position: 'relative',
  },
  routeLine: {
    position: 'absolute',
    width: 3,
    height: 100,
    backgroundColor: Colors.accentYellow,
    transform: [{ rotate: '45deg' }],
  },
  destinationPin: {
    position: 'absolute',
    top: 50,
    right: 80,
  },
  currentLocation: {
    position: 'absolute',
    bottom: 80,
    left: 100,
  },
  waypointInfo: {
    marginTop: Spacing.lg,
  },
  distanceCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.accentYellow,
  },
  distanceValue: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.accentYellow,
  },
  distanceLabel: {
    color: Colors.textSecondary,
    marginTop: 4,
  },
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
  mapsButtonIcon: {
    fontSize: 20,
  },
  mapsButtonText: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
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
  scenePlayer: {
    flex: 1,
    padding: Spacing.lg,
  },
  playerContainer: {
    height: 250,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  playButtonText: {
    fontSize: 30,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: Colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accentYellow,
  },
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
  continueButtonText: {
    color: Colors.primaryBackground,
    fontWeight: '700',
    fontSize: 16,
  },
  adContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  adContent: {
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  adTimer: {
    marginTop: Spacing.lg,
  },
  adTimerText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  skipAdButton: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
  },
  skipAdText: {
    color: Colors.accentYellow,
    fontWeight: '600',
  },
  questionView: {
    flex: 1,
    padding: Spacing.lg,
  },
  choicesContainer: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  choiceButton: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  choiceText: {
    color: Colors.textPrimary,
    fontSize: 16,
  },
  completionScreen: {
    flex: 1,
    backgroundColor: Colors.primaryBackground,
  },
  completionContent: {
    padding: Spacing.lg,
    paddingTop: 80,
    paddingBottom: 40,
  },
  completionHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
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
  ratingSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  star: {
    fontSize: 36,
    opacity: 0.3,
  },
  starActive: {
    opacity: 1,
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
  shareButtonIcon: {
    fontSize: 20,
  },
  shareButtonText: {
    color: Colors.primaryBackground,
    fontWeight: '700',
    fontSize: 16,
  },
  homeButton: {
    backgroundColor: Colors.accentYellow,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  homeButtonText: {
    color: Colors.primaryBackground,
    fontWeight: '700',
    fontSize: 16,
  },
});
