import { Platform } from 'react-native';

// RevenueCat public SDK keys are not secret — they identify the project on the
// device. Real values come from app.revenuecat.com → Project settings → API
// keys (one per platform). For now we read them from EXPO_PUBLIC_* env vars so
// the codepath is wired but the build still runs in dev/Expo Go without
// crashing if they're absent.
export const REVENUECAT_API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
  default: '',
}) as string;

// Premium subscription product / entitlement identifiers (Q8h).
// The "premium" entitlement is what we check at runtime to gate ad rendering;
// it must be configured in RevenueCat to attach to the monthly subscription.
export const PREMIUM_ENTITLEMENT_ID = 'premium';
export const PREMIUM_MONTHLY_PRODUCT_ID = 'com.urbanquest.app.premium.monthly';
export const PREMIUM_OFFERING_ID = 'default';

// Curated quest price tiers (Q8b). The "free" tier is ad-supported — it has
// no IAP product. Each priced tier maps 1:1 to a non-consumable IAP product
// configured in App Store Connect / Play Console / RevenueCat.
//
// Product ID convention: com.urbanquest.app.quest.tier_NNN where NNN is the
// price in cents. Keeping the product stable across price changes (we change
// the underlying tier in App Store Connect, not the product ID).
export interface PriceTier {
  /** Stable identifier used in Quest.priceTier and as the RevenueCat product key. */
  id: 'free' | 'tier_99' | 'tier_199' | 'tier_299' | 'tier_499' | 'tier_999';
  /** USD price for display only. Apple/Google convert to local currency at purchase. */
  priceUsd: number;
  /** RevenueCat package identifier — null for the free tier (no IAP). */
  productId: string | null;
  label: string;
}

export const PRICE_TIERS: readonly PriceTier[] = [
  { id: 'free', priceUsd: 0, productId: null, label: 'Free (ad-supported)' },
  { id: 'tier_99', priceUsd: 0.99, productId: 'com.urbanquest.app.quest.tier_99', label: '$0.99' },
  { id: 'tier_199', priceUsd: 1.99, productId: 'com.urbanquest.app.quest.tier_199', label: '$1.99' },
  { id: 'tier_299', priceUsd: 2.99, productId: 'com.urbanquest.app.quest.tier_299', label: '$2.99' },
  { id: 'tier_499', priceUsd: 4.99, productId: 'com.urbanquest.app.quest.tier_499', label: '$4.99' },
  { id: 'tier_999', priceUsd: 9.99, productId: 'com.urbanquest.app.quest.tier_999', label: '$9.99' },
] as const;

export function tierFromPrice(price: number): PriceTier {
  // Match the exact value; fall back to "free" if the stored price doesn't fit
  // a tier (legacy data or schema drift).
  return PRICE_TIERS.find((t) => Math.abs(t.priceUsd - price) < 0.01) ?? PRICE_TIERS[0];
}

export function tierFromProductId(productId: string): PriceTier | null {
  return PRICE_TIERS.find((t) => t.productId === productId) ?? null;
}
