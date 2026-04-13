import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';
import { useAuthStore } from '@/src/store';

export default function LoginScreen() {
  const { login } = useAuthStore();

  const handleLogin = (provider: 'apple' | 'google') => {
    login(provider);
    router.push('/(auth)/onboarding');
  };

  return (
    <View style={[AppStyles.container, styles.container]}>
      <View style={styles.header}>
        <Text style={Typography.headerLarge}>URBAN QUEST</Text>
        <Text style={[Typography.body, styles.subtitle]}>
          Location-based storytelling adventures
        </Text>
      </View>

      <View style={styles.heroContainer}>
        <View style={styles.heroPlaceholder}>
          <Text style={[Typography.headerMedium, { textAlign: 'center' }]}>🗺️</Text>
          <Text style={[Typography.caption, { textAlign: 'center', marginTop: Spacing.sm }]}>
            Discover quests near you
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.appleButton]}
          onPress={() => handleLogin('apple')}
        >
          <Text style={styles.appleIcon}>🍎</Text>
          <Text style={[Typography.body, styles.appleButtonText]}>
            Sign in with Apple
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.googleButton]}
          onPress={() => handleLogin('google')}
        >
          <Text style={styles.googleIcon}>G</Text>
          <Text style={[Typography.body, styles.googleButtonText]}>
            Sign in with Google
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[Typography.caption, styles.terms]}>
        By signing in, you agree to our Terms of Service and Privacy Policy
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'space-between',
    padding: Spacing.lg,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  heroContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: Colors.surface,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.accentYellow,
  },
  buttonContainer: {
    gap: Spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  appleButton: {
    backgroundColor: '#FFFFFF',
  },
  appleButtonText: {
    color: '#000000',
    fontWeight: '600',
  },
  appleIcon: {
    fontSize: 20,
  },
  googleButton: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  googleButtonText: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.accentYellow,
  },
  terms: {
    textAlign: 'center',
    marginTop: Spacing.lg,
    color: Colors.textSecondary,
  },
});
