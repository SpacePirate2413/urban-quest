import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';
import { useQuestStore } from '@/src/store';
import { MOCK_QUESTS } from '@/src/data/mockData';

type PaymentMethod = 'card' | 'apple' | 'google';

export default function CheckoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const quest = MOCK_QUESTS.find((q) => q.id === id) || MOCK_QUESTS[0];
  const { purchaseQuest } = useQuestStore();
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('apple');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePurchase = async () => {
    setIsProcessing(true);
    
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    purchaseQuest(quest.id);
    setIsProcessing(false);
    
    router.replace(`/quest/play?id=${quest.id}`);
  };

  const paymentMethods = [
    { id: 'apple' as PaymentMethod, icon: '🍎', label: 'Apple Pay' },
    { id: 'google' as PaymentMethod, icon: 'G', label: 'Google Pay' },
    { id: 'card' as PaymentMethod, icon: '💳', label: 'Credit Card' },
  ];

  return (
    <View style={AppStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={Typography.headerLarge}>CHECKOUT</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.questSummary}>
          <Image source={{ uri: quest.coverImageUrl }} style={styles.questImage} />
          <View style={styles.questInfo}>
            <Text style={Typography.headerMedium}>{quest.title}</Text>
            <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
              {quest.estimatedDurationMinutes} min · {quest.difficulty}
            </Text>
            <Text style={[Typography.caption, { color: Colors.accentCyan, marginTop: Spacing.xs }]}>
              30 days access
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={Typography.headerMedium}>Payment Method</Text>
          <View style={styles.paymentMethods}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentOption,
                  selectedPayment === method.id && styles.paymentOptionSelected,
                ]}
                onPress={() => setSelectedPayment(method.id)}
              >
                <Text style={styles.paymentIcon}>{method.icon}</Text>
                <Text style={styles.paymentLabel}>{method.label}</Text>
                {selectedPayment === method.id && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {selectedPayment === 'card' && (
          <View style={styles.section}>
            <Text style={Typography.headerMedium}>Card Details</Text>
            <View style={styles.cardForm}>
              <View style={styles.cardInput}>
                <Text style={styles.cardInputLabel}>Card Number</Text>
                <Text style={styles.cardInputPlaceholder}>•••• •••• •••• 4242</Text>
              </View>
              <View style={styles.cardRow}>
                <View style={[styles.cardInput, { flex: 1 }]}>
                  <Text style={styles.cardInputLabel}>Expiry</Text>
                  <Text style={styles.cardInputPlaceholder}>12/25</Text>
                </View>
                <View style={[styles.cardInput, { flex: 1, marginLeft: Spacing.md }]}>
                  <Text style={styles.cardInputLabel}>CVC</Text>
                  <Text style={styles.cardInputPlaceholder}>•••</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={Typography.headerMedium}>Order Summary</Text>
          <View style={styles.orderSummary}>
            <View style={styles.summaryRow}>
              <Text style={Typography.body}>Quest Price</Text>
              <Text style={Typography.body}>
                {quest.isFree ? 'Free' : `$${quest.price.toFixed(2)}`}
              </Text>
            </View>
            {quest.isFree && (
              <View style={styles.summaryRow}>
                <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
                  Includes ads after each scene
                </Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={[Typography.headerMedium, { color: Colors.textPrimary }]}>Total</Text>
              <Text style={[Typography.headerMedium, { color: Colors.accentYellow }]}>
                {quest.isFree ? 'Free' : `$${quest.price.toFixed(2)}`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.termsSection}>
          <Text style={[Typography.caption, { color: Colors.textSecondary, textAlign: 'center' }]}>
            By completing this purchase, you agree to our Terms of Service. 
            Your access expires 30 days after purchase.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.purchaseButton, isProcessing && styles.purchaseButtonDisabled]}
          onPress={handlePurchase}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Text style={styles.purchaseButtonText}>Processing...</Text>
          ) : (
            <Text style={styles.purchaseButtonText}>
              {quest.isFree ? 'Start Quest' : `Pay $${quest.price.toFixed(2)}`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: Spacing.lg,
    paddingTop: 60,
  },
  backButton: {
    color: Colors.accentYellow,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    paddingTop: 0,
  },
  questSummary: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  questImage: {
    width: 100,
    height: 100,
  },
  questInfo: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'center',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  paymentMethods: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  paymentOptionSelected: {
    borderColor: Colors.accentYellow,
  },
  paymentIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  paymentLabel: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  checkmark: {
    color: Colors.accentYellow,
    fontSize: 20,
    fontWeight: '700',
  },
  cardForm: {
    marginTop: Spacing.md,
  },
  cardInput: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  cardInputLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  cardInputPlaceholder: {
    color: Colors.textPrimary,
    fontSize: 16,
  },
  cardRow: {
    flexDirection: 'row',
  },
  orderSummary: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 12,
    marginTop: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
  },
  termsSection: {
    paddingVertical: Spacing.lg,
  },
  footer: {
    padding: Spacing.lg,
    paddingBottom: 34,
    backgroundColor: Colors.surface,
    borderTopWidth: 2,
    borderTopColor: Colors.border,
  },
  purchaseButton: {
    backgroundColor: Colors.accentYellow,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    color: Colors.primaryBackground,
    fontWeight: '700',
    fontSize: 18,
  },
});
