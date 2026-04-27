import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '@/src/store';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';

const PRIVACY_POLICY_URL = 'https://urbanquestapp.com/privacy-policy/';
const TERMS_URL = 'https://urbanquestapp.com/terms-conditions/';

export default function LoginScreen() {
  const { login } = useAuthStore();
  const [accepted, setAccepted] = useState(false);

  const handleLogin = (provider: 'apple' | 'google') => {
    if (!accepted) {
      Alert.alert(
        'Please review our policies',
        'You must agree to the Terms & Conditions and Privacy Policy before continuing.',
      );
      return;
    }
    login(provider);
    router.push('/(auth)/onboarding');
  };

  const openLink = (url: string) => {
    WebBrowser.openBrowserAsync(url);
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

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.consentRow}
          onPress={() => setAccepted((prev) => !prev)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          accessibilityLabel="I agree to the Terms and Conditions and Privacy Policy"
        >
          <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
            {accepted && <Text style={styles.checkboxMark}>✓</Text>}
          </View>
          <Text style={[Typography.caption, styles.consentText]}>
            I agree to the{' '}
            <Text style={styles.link} onPress={() => openLink(TERMS_URL)}>
              Terms &amp; Conditions
            </Text>{' '}
            and{' '}
            <Text style={styles.link} onPress={() => openLink(PRIVACY_POLICY_URL)}>
              Privacy Policy
            </Text>
            .
          </Text>
        </TouchableOpacity>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.appleButton, !accepted && styles.buttonDisabled]}
            onPress={() => handleLogin('apple')}
            disabled={!accepted}
            accessibilityState={{ disabled: !accepted }}
          >
            <Text style={styles.appleIcon}>🍎</Text>
            <Text style={[Typography.body, styles.appleButtonText]}>Sign in with Apple</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.googleButton, !accepted && styles.buttonDisabled]}
            onPress={() => handleLogin('google')}
            disabled={!accepted}
            accessibilityState={{ disabled: !accepted }}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={[Typography.body, styles.googleButtonText]}>Sign in with Google</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  bottomContainer: {
    gap: Spacing.md,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    minHeight: 44,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.accentYellow,
    borderColor: Colors.accentYellow,
  },
  checkboxMark: {
    color: '#000000',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  consentText: {
    flex: 1,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  link: {
    color: Colors.accentYellow,
    textDecorationLine: 'underline',
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
  buttonDisabled: {
    opacity: 0.45,
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
});
