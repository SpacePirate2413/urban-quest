import { useSubscription } from '@/src/hooks/useSubscription';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';
import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const FEATURES: { icon: string; title: string; description: string }[] = [
  {
    icon: '🚫',
    title: 'No ads',
    description: 'Play every free quest end-to-end without a single interstitial.',
  },
  {
    icon: '🎧',
    title: 'Uninterrupted narration',
    description: 'Stay inside the story — no break in the audio between scenes.',
  },
  {
    icon: '🤝',
    title: 'Support creators',
    description: 'Premium subscribers help fund the platform that pays creators.',
  },
];

export default function PremiumScreen() {
  const { isPremium, isPurchasing, offering, purchasePremium, restorePurchases } =
    useSubscription();

  const monthly = offering?.monthly ?? offering?.availablePackages?.[0];
  const priceLabel =
    monthly?.product.priceString ?? '$5.99/mo';

  const handlePurchase = async () => {
    try {
      await purchasePremium();
      Alert.alert(
        'Welcome to Premium!',
        'Ads are off and your subscription is active. Manage it anytime in your device settings.',
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (err: any) {
      Alert.alert('Purchase failed', err?.message ?? 'Please try again.');
    }
  };

  const handleRestore = async () => {
    try {
      await restorePurchases();
      Alert.alert('Restored', 'Any prior purchases tied to your store account have been restored.');
    } catch (err: any) {
      Alert.alert('Restore failed', err?.message ?? 'Please try again.');
    }
  };

  return (
    <ScrollView style={AppStyles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
        <Text style={styles.closeBtnText}>×</Text>
      </TouchableOpacity>

      <View style={styles.hero}>
        <Text style={styles.heroIcon}>⭐</Text>
        <Text style={[Typography.headerLarge, styles.heroTitle]}>Urban Quest Premium</Text>
        <Text style={[Typography.body, styles.heroSubtitle]}>
          {isPremium
            ? 'You are a Premium subscriber. Thanks for the support!'
            : 'Remove ads from every free quest.'}
        </Text>
      </View>

      <View style={styles.featureList}>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.feature}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <View style={styles.featureText}>
              <Text style={[Typography.body, styles.featureTitle]}>{f.title}</Text>
              <Text style={[Typography.caption, styles.featureDesc]}>{f.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {!isPremium && (
        <View style={styles.priceBox}>
          <Text style={[Typography.headerLarge, styles.priceMain]}>{priceLabel}</Text>
          <Text style={[Typography.caption, styles.priceSubtle]}>
            Auto-renews monthly. Cancel anytime in your device settings.
          </Text>
        </View>
      )}

      {isPremium ? (
        <TouchableOpacity style={[styles.cta, styles.ctaSecondary]} onPress={() => router.back()}>
          <Text style={styles.ctaText}>Done</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.cta, isPurchasing && { opacity: 0.6 }]}
          onPress={handlePurchase}
          disabled={isPurchasing}
        >
          {isPurchasing ? (
            <ActivityIndicator color={Colors.primaryBackground} />
          ) : (
            <Text style={styles.ctaText}>Subscribe</Text>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={handleRestore} style={styles.restoreBtn} disabled={isPurchasing}>
        <Text style={styles.restoreText}>Restore previous purchase</Text>
      </TouchableOpacity>

      <Text style={[Typography.caption, styles.legal]}>
        Subscription is processed by your device's app store. Payment is charged to your Apple ID
        or Google account. Subscription auto-renews unless turned off at least 24 hours before the
        end of the current period. Manage or cancel anytime in your device settings.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingTop: 60,
    paddingBottom: 60,
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: Spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    zIndex: 1,
  },
  closeBtnText: {
    color: Colors.textPrimary,
    fontSize: 24,
    lineHeight: 28,
  },
  hero: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  heroIcon: {
    fontSize: 64,
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    color: Colors.accentYellow,
    textAlign: 'center',
  },
  heroSubtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  featureList: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  featureIcon: {
    fontSize: 28,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  featureDesc: {
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  priceBox: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  priceMain: {
    color: Colors.cyan,
  },
  priceSubtle: {
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  cta: {
    backgroundColor: Colors.accentYellow,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  ctaSecondary: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  ctaText: {
    color: Colors.primaryBackground,
    fontWeight: '700',
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  restoreBtn: {
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  restoreText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  legal: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.lg,
    lineHeight: 16,
    paddingHorizontal: Spacing.sm,
  },
});
