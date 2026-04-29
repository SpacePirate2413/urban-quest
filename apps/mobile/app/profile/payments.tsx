import { useSubscription } from '@/src/hooks/useSubscription';
import { api } from '@/src/services/api';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Deep link for the platform-specific subscription management screen.
// iOS: opens the App Store's "Subscriptions" page directly.
// Android: opens the Play Store's account subscriptions page.
// Per Apple's Guideline 3.1.2, this is the *only* way our app can refer
// users to subscription management — we cannot show our own UI for it.
const SUBSCRIPTION_MANAGE_URL = Platform.select({
  ios: 'itms-apps://apps.apple.com/account/subscriptions',
  android:
    'https://play.google.com/store/account/subscriptions?package=com.urbanquest.app',
  default: 'https://urbanquestapp.com/support',
});

interface Purchase {
  id: string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
  status: string;
  createdAt: string;
  quest?: {
    id?: string;
    title?: string;
    coverImage?: string | null;
  };
}

export default function PaymentMethodsScreen() {
  const { isPremium, restorePurchases, isPurchasing } = useSubscription();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getMyPurchases();
      setPurchases(Array.isArray(data) ? data : []);
    } catch {
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const handleManageSubscription = () => {
    Linking.openURL(SUBSCRIPTION_MANAGE_URL).catch(() => {
      Alert.alert(
        'Could not open subscriptions',
        Platform.OS === 'ios'
          ? 'Open the App Store app, tap your profile picture, then "Subscriptions".'
          : 'Open the Play Store app, tap your profile picture, then "Payments and subscriptions" → "Subscriptions".',
      );
    });
  };

  const handleRestore = async () => {
    try {
      await restorePurchases();
      Alert.alert(
        'Restored',
        'Any prior purchases on your store account have been restored.',
      );
      loadPurchases();
    } catch (err: any) {
      Alert.alert('Restore failed', err?.message ?? 'Please try again.');
    }
  };

  return (
    <ScrollView style={AppStyles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={Typography.headerLarge}>Payments</Text>
      </View>

      {/* Apple/Google IAP context — required by App Review for clarity */}
      <View style={styles.infoCard}>
        <Text style={styles.sectionLabel}>How payments work</Text>
        <Text style={[Typography.body, { color: Colors.textSecondary, lineHeight: 20 }]}>
          All Urban Quest purchases — Premium subscription and individual quest
          unlocks — are processed by{' '}
          {Platform.OS === 'ios' ? 'the Apple App Store' : 'Google Play'}. Your
          payment method is the one on file with your{' '}
          {Platform.OS === 'ios' ? 'Apple ID' : 'Google account'}; we never see or
          store card details.
        </Text>
      </View>

      {/* Premium subscription state */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Premium Subscription</Text>
        <View style={styles.subStatusRow}>
          <Text style={[Typography.body, { fontWeight: '600' }]}>
            {isPremium ? '⭐ Active' : 'Not subscribed'}
          </Text>
          <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
            $5.99 / month
          </Text>
        </View>
        <Text
          style={[
            Typography.caption,
            { color: Colors.textSecondary, marginTop: Spacing.xs, lineHeight: 16 },
          ]}
        >
          {isPremium
            ? 'Manage renewal, change plan, or cancel below — handled by the App Store.'
            : 'Tap "Go Premium" on the Profile screen to subscribe. Removes ads from every quest.'}
        </Text>

        <TouchableOpacity style={styles.cta} onPress={handleManageSubscription}>
          <Text style={styles.ctaText}>
            {Platform.OS === 'ios' ? 'Manage in App Store' : 'Manage on Google Play'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryCta}
          onPress={handleRestore}
          disabled={isPurchasing}
        >
          <Text style={styles.secondaryCtaText}>
            {isPurchasing ? 'Restoring…' : 'Restore previous purchases'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Per-quest purchase history */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Quest Purchase History</Text>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.cyan} />
          </View>
        ) : purchases.length === 0 ? (
          <Text style={[Typography.body, { color: Colors.textSecondary, lineHeight: 20 }]}>
            No quest purchases yet. Once you buy a paid quest it will show up here with
            its receipt details.
          </Text>
        ) : (
          purchases.map((p) => (
            <View key={p.id} style={styles.purchaseRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={[Typography.body, { fontWeight: '600' }]}
                  numberOfLines={1}
                >
                  {p.quest?.title ?? 'Unknown quest'}
                </Text>
                <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: 2 }]}>
                  {new Date(p.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[Typography.body, { color: Colors.cyan, fontWeight: '700' }]}>
                  {p.amount > 0
                    ? `$${p.amount.toFixed(2)}`
                    : 'Free'}
                </Text>
                <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: 2 }]}>
                  {p.status}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Refunds</Text>
        <Text style={[Typography.body, { color: Colors.textSecondary, lineHeight: 20 }]}>
          {Platform.OS === 'ios'
            ? "Refund requests are handled by Apple. Open Apple's Report a Problem page (reportaproblem.apple.com), sign in with your Apple ID, and find the Urban Quest charge to request a refund."
            : "Refund requests are handled by Google. Open the Play Store's order history, find the Urban Quest purchase, and tap 'Refund' (within 48 hours of purchase) or 'Report a problem' (after 48 hours)."}
        </Text>
        <TouchableOpacity
          style={styles.secondaryCta}
          onPress={() =>
            Linking.openURL(
              Platform.OS === 'ios'
                ? 'https://reportaproblem.apple.com'
                : 'https://play.google.com/store/account/orderhistory',
            )
          }
        >
          <Text style={styles.secondaryCtaText}>
            {Platform.OS === 'ios' ? "Open Apple's refund site" : 'Open Play order history'}
          </Text>
        </TouchableOpacity>
      </View>
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
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    color: Colors.cyan,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  subStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cta: {
    marginTop: Spacing.md,
    backgroundColor: Colors.cyan,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  ctaText: {
    color: Colors.primaryBackground,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  secondaryCta: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    alignItems: 'center',
  },
  secondaryCtaText: {
    color: Colors.cyan,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  loadingRow: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  purchaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
