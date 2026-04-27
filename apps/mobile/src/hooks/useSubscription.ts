import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import {
  PREMIUM_ENTITLEMENT_ID,
  PREMIUM_OFFERING_ID,
  REVENUECAT_API_KEY,
} from '../lib/monetization';

// Only configure RevenueCat once per app launch. Multiple `Purchases.configure`
// calls trigger warnings and reset the cached customer state.
let configured = false;

export function configureRevenueCat(userId?: string) {
  if (configured) return;
  if (!REVENUECAT_API_KEY) {
    // No key configured (Expo Go / fresh dev environment). The hook below
    // gracefully no-ops so the app still runs.
    return;
  }
  Purchases.configure({ apiKey: REVENUECAT_API_KEY, appUserID: userId });
  configured = true;
}

interface SubscriptionState {
  /** Has an active "premium" entitlement (i.e., monthly sub is current). */
  isPremium: boolean;
  /** Whether RevenueCat is initialized and reachable. */
  isReady: boolean;
  /** Loading flag while a purchase is in flight. */
  isPurchasing: boolean;
  /** Latest customer info from RevenueCat, if any. */
  customerInfo: CustomerInfo | null;
  /** The "premium" offering, used to render the paywall. */
  offering: PurchasesOffering | null;
  /** Trigger a purchase of the monthly premium package. */
  purchasePremium: () => Promise<void>;
  /** Restore prior purchases (required button by App Store Review Guideline 3.1.1). */
  restorePurchases: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const isPremium = useMemo(() => {
    if (!customerInfo) return false;
    return Boolean(customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
  }, [customerInfo]);

  useEffect(() => {
    if (!REVENUECAT_API_KEY) return;

    let cancelled = false;

    async function load() {
      try {
        const info = await Purchases.getCustomerInfo();
        if (!cancelled) setCustomerInfo(info);

        const offerings = await Purchases.getOfferings();
        const target =
          offerings.all[PREMIUM_OFFERING_ID] ?? offerings.current ?? null;
        if (!cancelled) setOffering(target);
      } catch (err) {
        // No-op — typically thrown in dev when the project isn't configured
        // yet. Real errors surface during purchase().
        // eslint-disable-next-line no-console
        console.warn('[useSubscription] init failed:', err);
      }
    }

    load();

    const listener = (info: CustomerInfo) => {
      if (!cancelled) setCustomerInfo(info);
    };
    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      cancelled = true;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  const purchasePremium = useCallback(async () => {
    if (!offering) {
      throw new Error('Subscription not ready yet — try again in a moment.');
    }
    const monthly = offering.monthly ?? offering.availablePackages[0];
    if (!monthly) throw new Error('Premium plan unavailable.');

    setIsPurchasing(true);
    try {
      const { customerInfo: updated } = await Purchases.purchasePackage(monthly);
      setCustomerInfo(updated);
    } catch (err: any) {
      // RevenueCat surfaces user-cancellation as an error with code
      // PURCHASE_CANCELLED — swallow it so we don't show an alert for that.
      if (err?.userCancelled) return;
      throw err;
    } finally {
      setIsPurchasing(false);
    }
  }, [offering]);

  const restorePurchases = useCallback(async () => {
    setIsPurchasing(true);
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
    } finally {
      setIsPurchasing(false);
    }
  }, []);

  return {
    isPremium,
    isReady: !!customerInfo,
    isPurchasing,
    customerInfo,
    offering,
    purchasePremium,
    restorePurchases,
  };
}

// Useful for non-React callsites (e.g., from inside a service, or for the ad
// frequency cap to short-circuit when the user is premium without subscribing
// to the hook).
export async function isPremiumNow(): Promise<boolean> {
  if (!REVENUECAT_API_KEY) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return Boolean(info.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
  } catch {
    return false;
  }
}

// Purchase a single quest by its IAP product ID (one of the curated tier
// products from PRICE_TIERS). On success returns the RevenueCat transaction
// identifier so the caller can record it server-side.
export async function purchaseQuestProduct(productId: string): Promise<{
  transactionIdentifier: string | null;
  cancelled: boolean;
}> {
  if (!REVENUECAT_API_KEY) {
    throw new Error('Payments are not configured in this build.');
  }
  try {
    const products = await Purchases.getProducts([productId]);
    if (products.length === 0) {
      throw new Error('This quest is not available for purchase right now.');
    }
    const result = await Purchases.purchaseStoreProduct(products[0]);
    return {
      transactionIdentifier:
        (result as any)?.transaction?.transactionIdentifier ?? null,
      cancelled: false,
    };
  } catch (err: any) {
    if (err?.userCancelled) {
      return { transactionIdentifier: null, cancelled: true };
    }
    throw err;
  }
}

// Re-export Platform for screens that want to label "Manage on App Store / Play Store"
export { Platform };
