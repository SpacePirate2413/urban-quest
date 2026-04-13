import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';
import { useAuthStore, useLocationStore } from '@/src/store';
import { PRESET_AVATARS } from '@/src/data/mockData';
import { UserRole } from '@/src/types';

type OnboardingStep = 'birthdate' | 'username' | 'avatar' | 'location';

export default function OnboardingScreen() {
  const [step, setStep] = useState<OnboardingStep>('birthdate');
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

  const { completeOnboarding } = useAuthStore();
  const { setLocationPermission } = useLocationStore();

  const handleBirthdateNext = () => {
    const year = parseInt(birthYear);
    const month = parseInt(birthMonth);
    const day = parseInt(birthDay);

    if (!year || !month || !day || year < 1900 || year > 2020 || month < 1 || month > 12 || day < 1 || day > 31) {
      Alert.alert('Invalid Date', 'Please enter a valid birthdate.');
      return;
    }

    setStep('username');
  };

  const handleUsernameNext = () => {
    if (username.length < 3 || username.length > 20) {
      Alert.alert('Invalid Username', 'Username must be 3-20 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      Alert.alert('Invalid Username', 'Username can only contain letters, numbers, and underscores.');
      return;
    }

    setStep('avatar');
  };

  const handleAvatarNext = () => {
    setStep('location');
  };

  const handleLocationPermission = (granted: boolean) => {
    setLocationPermission(granted ? 'granted' : 'denied');
    
    useAuthStore.setState({
      isAuthenticated: true,
      isOnboarding: false,
      user: {
        id: 'new_user_' + Date.now(),
        email: 'user@example.com',
        username,
        avatarUrl: selectedAvatar || PRESET_AVATARS[0],
        avatarType: 'preset',
        role: UserRole.PLAYER,
        birthdate: new Date(parseInt(birthYear), parseInt(birthMonth) - 1, parseInt(birthDay)),
        totalXP: 0,
        createdQuests: [],
        purchasedQuests: [],
        completedQuestsCount: 0,
        reviewsWritten: [],
        createdAt: new Date(),
      },
    });

    completeOnboarding();
    router.replace('/(tabs)');
  };

  const renderBirthdateStep = () => (
    <View style={styles.stepContainer}>
      <Text style={Typography.headerMedium}>When were you born?</Text>
      <Text style={[Typography.body, styles.stepDescription]}>
        We use this to show you age-appropriate quests.
      </Text>

      <View style={styles.dateInputContainer}>
        <View style={styles.dateInputWrapper}>
          <Text style={Typography.caption}>Month</Text>
          <TextInput
            style={styles.dateInput}
            placeholder="MM"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="number-pad"
            maxLength={2}
            value={birthMonth}
            onChangeText={setBirthMonth}
          />
        </View>
        <View style={styles.dateInputWrapper}>
          <Text style={Typography.caption}>Day</Text>
          <TextInput
            style={styles.dateInput}
            placeholder="DD"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="number-pad"
            maxLength={2}
            value={birthDay}
            onChangeText={setBirthDay}
          />
        </View>
        <View style={styles.dateInputWrapper}>
          <Text style={Typography.caption}>Year</Text>
          <TextInput
            style={styles.dateInput}
            placeholder="YYYY"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="number-pad"
            maxLength={4}
            value={birthYear}
            onChangeText={setBirthYear}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleBirthdateNext}>
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderUsernameStep = () => (
    <View style={styles.stepContainer}>
      <Text style={Typography.headerMedium}>Choose your username</Text>
      <Text style={[Typography.body, styles.stepDescription]}>
        This is how other players will see you.
      </Text>

      <TextInput
        style={styles.textInput}
        placeholder="Enter username"
        placeholderTextColor={Colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={20}
        value={username}
        onChangeText={setUsername}
      />

      <Text style={[Typography.caption, styles.hint]}>
        3-20 characters. Letters, numbers, and underscores only.
      </Text>

      <TouchableOpacity style={styles.primaryButton} onPress={handleUsernameNext}>
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAvatarStep = () => (
    <View style={styles.stepContainer}>
      <Text style={Typography.headerMedium}>Choose your avatar</Text>
      <Text style={[Typography.body, styles.stepDescription]}>
        Pick a profile picture or upload your own later.
      </Text>

      <View style={styles.avatarGrid}>
        {PRESET_AVATARS.map((avatar, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.avatarOption,
              selectedAvatar === avatar && styles.avatarSelected,
            ]}
            onPress={() => setSelectedAvatar(avatar)}
          >
            <Image source={{ uri: avatar }} style={styles.avatarImage} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Upload Custom Photo</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.primaryButton} onPress={handleAvatarNext}>
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLocationStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.locationIcon}>
        <Text style={{ fontSize: 60 }}>📍</Text>
      </View>

      <Text style={[Typography.headerMedium, { textAlign: 'center' }]}>
        Enable Location Services
      </Text>
      <Text style={[Typography.body, styles.stepDescription, { textAlign: 'center' }]}>
        Urban Quest is a location-based game and requires location services to play. 
        We'll use your location to show nearby quests and unlock scenes when you arrive.
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => handleLocationPermission(true)}
      >
        <Text style={styles.primaryButtonText}>Enable Location</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.textButton}
        onPress={() => handleLocationPermission(false)}
      >
        <Text style={styles.textButtonText}>Maybe Later</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={AppStyles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.progressContainer}>
        {['birthdate', 'username', 'avatar', 'location'].map((s, i) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              (step === s || ['birthdate', 'username', 'avatar', 'location'].indexOf(step) > i) &&
                styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      {step === 'birthdate' && renderBirthdateStep()}
      {step === 'username' && renderUsernameStep()}
      {step === 'avatar' && renderAvatarStep()}
      {step === 'location' && renderLocationStep()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
    paddingTop: 60,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
  },
  progressDotActive: {
    backgroundColor: Colors.accentYellow,
  },
  stepContainer: {
    flex: 1,
  },
  stepDescription: {
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  dateInputContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  dateInputWrapper: {
    flex: 1,
  },
  dateInput: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: 18,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  hint: {
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  avatarOption: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: Colors.border,
  },
  avatarSelected: {
    borderColor: Colors.accentYellow,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  locationIcon: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  primaryButton: {
    backgroundColor: Colors.accentYellow,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  primaryButtonText: {
    color: Colors.primaryBackground,
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
  textButton: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  textButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
