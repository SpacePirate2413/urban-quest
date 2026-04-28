import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthStore } from '@/src/store';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';

const PRIVACY_POLICY_URL = 'https://urbanquestapp.com/privacy-policy/';
const TERMS_URL = 'https://urbanquestapp.com/terms-conditions/';

// Default email/name values match the creator-station's dev login so the
// same Brent can sign in on both surfaces and see the same account.
const DEV_USER = { email: 'creator@urbanquest.dev', name: 'Test Creator' };

export default function LoginScreen() {
  const { login, devLogin } = useAuthStore();
  const [accepted, setAccepted] = useState(false);
  const [email, setEmail] = useState(DEV_USER.email);
  const [name, setName] = useState(DEV_USER.name);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requireConsent = (): boolean => {
    if (!accepted) {
      Alert.alert(
        'Please review our policies',
        'You must agree to the Terms & Conditions and Privacy Policy before continuing.',
      );
      return false;
    }
    return true;
  };

  const handleProviderLogin = (provider: 'apple' | 'google') => {
    if (!requireConsent()) return;
    login(provider);
    router.push('/(auth)/onboarding');
  };

  const handleEmailLogin = async () => {
    if (!requireConsent()) return;
    if (!email.trim()) {
      Alert.alert('Email required', 'Enter the email associated with your Urban Quest account.');
      return;
    }
    setIsSubmitting(true);
    try {
      await devLogin(email.trim(), name.trim() || email.split('@')[0]);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert(
        'Sign in failed',
        err?.message ??
          'Could not sign you in. Make sure the API server is running and try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openLink = (url: string) => {
    WebBrowser.openBrowserAsync(url);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={AppStyles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={Typography.headerLarge}>URBAN QUEST</Text>
          <Text style={[Typography.body, styles.subtitle]}>
            Location-based storytelling adventures
          </Text>
        </View>

        <View style={styles.heroContainer}>
          <View style={styles.heroPlaceholder}>
            <Text style={[Typography.headerMedium, { textAlign: 'center' }]}>🗺️</Text>
            <Text
              style={[
                Typography.caption,
                { textAlign: 'center', marginTop: Spacing.sm },
              ]}
            >
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

          {/* Email sign-in — same path the creator-station web app uses, so
              the same account works in both places. Real Apple / Google
              sign-in is wired below but currently stubbed; this is what
              actually authenticates against the API. */}
          <View style={styles.emailForm}>
            <Text style={styles.emailLabel}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.emailInput}
              editable={!isSubmitting}
            />
            <Text style={styles.emailLabel}>Display Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="words"
              style={styles.emailInput}
              editable={!isSubmitting}
            />
            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                (!accepted || isSubmitting) && styles.buttonDisabled,
              ]}
              onPress={handleEmailLogin}
              disabled={!accepted || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={Colors.primaryBackground} />
              ) : (
                <Text style={styles.primaryButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.appleButton,
                (!accepted || isSubmitting) && styles.buttonDisabled,
              ]}
              onPress={() => handleProviderLogin('apple')}
              disabled={!accepted || isSubmitting}
              accessibilityState={{ disabled: !accepted || isSubmitting }}
            >
              <Text style={styles.appleIcon}>🍎</Text>
              <Text style={[Typography.body, styles.appleButtonText]}>Sign in with Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.googleButton,
                (!accepted || isSubmitting) && styles.buttonDisabled,
              ]}
              onPress={() => handleProviderLogin('google')}
              disabled={!accepted || isSubmitting}
              accessibilityState={{ disabled: !accepted || isSubmitting }}
            >
              <Text style={styles.googleIcon}>G</Text>
              <Text style={[Typography.body, styles.googleButtonText]}>Sign in with Google</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: Spacing.lg,
    paddingTop: 60,
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
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  heroPlaceholder: {
    width: 140,
    height: 140,
    backgroundColor: Colors.surface,
    borderRadius: 70,
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
  emailForm: {
    gap: Spacing.sm,
  },
  emailLabel: {
    fontSize: 11,
    color: Colors.cyan,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emailInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    color: Colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  primaryButton: {
    backgroundColor: Colors.cyan,
  },
  primaryButtonText: {
    color: Colors.primaryBackground,
    fontWeight: '700',
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
