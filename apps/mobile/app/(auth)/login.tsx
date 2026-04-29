import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

// Required so the AuthSession redirect lands back on the app cleanly when
// Google's auth completes in the system browser.
WebBrowser.maybeCompleteAuthSession();

const PRIVACY_POLICY_URL = 'https://urbanquestapp.com/privacy-policy/';
const TERMS_URL = 'https://urbanquestapp.com/terms-conditions/';

// Bump the suffix when the live Terms / Privacy Policy materially change,
// so users have to re-acknowledge the new version. Today both docs are
// effective 2026-04-26 — that's where the date in the key comes from.
const TERMS_ACCEPTED_KEY = 'terms_accepted:2026-04-26';

// Default email/name values match the creator-station's dev login so the
// same Brent can sign in on both surfaces and see the same account.
const DEV_USER = { email: 'creator@urbanquest.dev', name: 'Test Creator' };

export default function LoginScreen() {
  const { devLogin, signInWithProvider } = useAuthStore();
  const [accepted, setAccepted] = useState(false);
  const [email, setEmail] = useState(DEV_USER.email);
  const [name, setName] = useState(DEV_USER.name);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  // Restore the user's prior acceptance of Terms + Privacy Policy. Once
  // they've checked the box once, it stays checked across sign-outs and
  // launches — until the storage key changes (i.e. the live policy gets
  // a new effective date). That matches the App Store / Play Store
  // expectation that consent persists between sessions but a material
  // policy change requires a fresh acknowledgement.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(TERMS_ACCEPTED_KEY)
      .then((value) => {
        if (!cancelled && value === 'true') setAccepted(true);
      })
      .catch(() => {
        // No-op — the user can still tap to accept; we just don't
        // pre-fill from a corrupted storage read.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleAccepted = () => {
    setAccepted((prev) => {
      const next = !prev;
      AsyncStorage.setItem(TERMS_ACCEPTED_KEY, next ? 'true' : 'false').catch(() => {});
      return next;
    });
  };

  // Apple Sign In is iOS-only at the system level. Hide the button on
  // platforms where it can't function rather than render a button that
  // fails on press.
  useEffect(() => {
    let cancelled = false;
    AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (!cancelled) setAppleAvailable(available);
      })
      .catch(() => {
        if (!cancelled) setAppleAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Google Sign In via expo-auth-session. The `useIdTokenAuthRequest` flow
  // returns an idToken we can hand to /users/auth/mobile/token for backend
  // verification. Each platform needs its own OAuth client ID — see
  // EXPO_PUBLIC_GOOGLE_CLIENT_ID_* env vars and the README.
  //
  // The hook validates that the platform-specific client ID is a non-empty
  // string at init time and throws otherwise, which would crash the entire
  // screen before the user even sees it. To keep the screen usable while
  // those env vars are still being set up (Q-C2 in the tracker), we pass a
  // recognizable placeholder. The button's onPress handler still checks the
  // real env var and shows a friendly "not configured" Alert before
  // attempting any actual auth, so the placeholder never reaches Google.
  const PLACEHOLDER_CID = 'not-configured.apps.googleusercontent.com';
  const [, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || PLACEHOLDER_CID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || PLACEHOLDER_CID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || PLACEHOLDER_CID,
    scopes: ['openid', 'email', 'profile'],
  });

  // When Google's flow returns successfully, hand the idToken to the
  // backend exchange. Errors from the prompt itself are non-fatal (user
  // dismissed the sheet, network blip, etc.).
  useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    const idToken = googleResponse.params?.id_token;
    if (!idToken) return;
    (async () => {
      setIsSubmitting(true);
      try {
        await signInWithProvider('google', idToken);
        router.replace('/(tabs)');
      } catch (err: any) {
        Alert.alert('Google sign-in failed', err?.message ?? 'Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    })();
  }, [googleResponse, signInWithProvider]);

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

  const handleAppleLogin = async () => {
    if (!requireConsent()) return;
    setIsSubmitting(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error('Apple did not return an identity token.');
      }
      await signInWithProvider('apple', credential.identityToken);
      router.replace('/(tabs)');
    } catch (err: any) {
      // The native sheet sets `code === 'ERR_REQUEST_CANCELED'` when the
      // user dismisses without signing in. Don't show an error for that.
      if (err?.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('Apple sign-in failed', err?.message ?? 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!requireConsent()) return;
    if (!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS && !process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID) {
      Alert.alert(
        'Google sign-in not configured',
        'Set EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS / EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID in apps/mobile/.env to enable. Use email sign-in for now.',
      );
      return;
    }
    try {
      await promptGoogle();
    } catch (err: any) {
      Alert.alert('Google sign-in failed', err?.message ?? 'Please try again.');
    }
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
            onPress={toggleAccepted}
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
            {appleAvailable && (
              // Native Apple-styled button — required for App Store
              // submission per Guideline 4.8 when other social logins are
              // present. AppleAuthenticationButton uses the system's
              // pixel-perfect rendering so we don't have to maintain
              // light/dark variants manually.
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={12}
                style={[
                  styles.appleNativeButton,
                  (!accepted || isSubmitting) && styles.buttonDisabled,
                ]}
                onPress={handleAppleLogin}
              />
            )}

            <TouchableOpacity
              style={[
                styles.button,
                styles.googleButton,
                (!accepted || isSubmitting) && styles.buttonDisabled,
              ]}
              onPress={handleGoogleLogin}
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
  appleNativeButton: {
    width: '100%',
    height: 48,
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
