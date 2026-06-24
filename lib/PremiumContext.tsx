import { useGlobalContext } from "@/lib/GlobalContext";
import { useRouter } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Purchases, {
  CustomerInfo,
  CustomerInfoUpdateListener,
  PURCHASES_ERROR_CODE,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";
import {
  ensureRevenueCatConfigured,
  hasActiveEntitlement,
  isRevenueCatNativeAvailable,
} from "./revenuecat";
import { useAuthSession } from "./auth/AuthContext";
import { apiClient } from "./api/client";
import { EntitlementsResponse } from "./api/types";
import { queryClient } from "./queryClient";

type PremiumContextType = {
  isPro: boolean;
  paidActive: boolean;
  bypassActive: boolean;
  developerModeEnabled: boolean;
  canUseDeveloperMode: boolean;
  loading: boolean;
  customerInfo: CustomerInfo | null;
  packages: PurchasesPackage[];
  currentOffering: PurchasesOffering | null;
  upgradeToPro: (selectedPackage?: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refreshEntitlements: () => Promise<void>;
  setDeveloperMode: (enabled: boolean) => Promise<boolean>;
  openPaywall: (reason?: string) => void;
};

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export const PremiumProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { currentUser } = useGlobalContext();
  const { identity } = useAuthSession();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [backendEntitlement, setBackendEntitlement] =
    useState<EntitlementsResponse | null>(null);
  const [currentOffering, setCurrentOffering] =
    useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [entitlementLoading, setEntitlementLoading] = useState(false);
  const [developerModeLoading, setDeveloperModeLoading] = useState(false);
  const [userResolved, setUserResolved] = useState(false);
  const lastAppUserIdRef = React.useRef<string | null>(null);
  const router = useRouter();
  const currentUserId = currentUser?.id;

  const fetchOfferings = useCallback(async () => {
    if (!ensureRevenueCatConfigured()) return;
    try {
      const offerings = await Purchases.getOfferings();
      setCurrentOffering(offerings.current ?? null);
    } catch (error) {
      console.warn("[RevenueCat] Failed to load offerings", error);
    }
  }, []);

  useEffect(() => {
    const configured = ensureRevenueCatConfigured();
    if (!configured) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const bootstrap = async () => {
      try {
        const info = await Purchases.getCustomerInfo();
        if (!cancelled) {
          setCustomerInfo(info);
        }
        await fetchOfferings();
      } catch (error) {
        console.warn("[RevenueCat] Unable to fetch customer info", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    bootstrap();
    const listener: CustomerInfoUpdateListener = (info) => {
      setCustomerInfo(info);
    };
    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      cancelled = true;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [fetchOfferings]);

  useEffect(() => {
    if (currentUser !== undefined) {
      setUserResolved(true);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUserId) {
      setBackendEntitlement(null);
      setEntitlementLoading(false);
      return;
    }

    let cancelled = false;
    const loadEntitlements = async () => {
      try {
        setEntitlementLoading(true);
        const entitlement = await apiClient.getEntitlements();
        if (!cancelled) setBackendEntitlement(entitlement);
      } catch (error) {
        console.warn("[Entitlements] Unable to fetch backend state", error);
      } finally {
        if (!cancelled) setEntitlementLoading(false);
      }
    };

    void loadEntitlements();
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  const refreshEntitlements = useCallback(async () => {
    if (!currentUserId) {
      setBackendEntitlement(null);
      return;
    }
    try {
      setEntitlementLoading(true);
      const entitlement = await apiClient.getEntitlements();
      setBackendEntitlement(entitlement);
    } finally {
      setEntitlementLoading(false);
    }
  }, [currentUserId]);

  const invalidatePremiumQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["usage"] }),
      queryClient.invalidateQueries({ queryKey: ["leanks"] }),
      queryClient.invalidateQueries({ queryKey: ["messages"] }),
    ]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const identify = async () => {
      if (!userResolved) return;
      const configured = ensureRevenueCatConfigured();
      if (!configured) return;

      try {
        const appUserId = identity?.id;
        if (appUserId && lastAppUserIdRef.current !== appUserId) {
          if (isRevenueCatNativeAvailable()) {
            const { customerInfo: info } = await Purchases.logIn(appUserId);
            if (!cancelled) setCustomerInfo(info);
          }
          lastAppUserIdRef.current = appUserId;
        } else if (!appUserId) {
          // Do not logOut to avoid creating new anonymous customers; just clear local state
          lastAppUserIdRef.current = null;
          if (!cancelled) setCustomerInfo(null);
        }
      } catch (error) {
        console.warn("[RevenueCat] Unable to sync user identity", error);
      }
    };

    identify();
    return () => {
      cancelled = true;
    };
  }, [identity?.id, userResolved]);

  const upgradeToPro = useCallback(
    async (selectedPackage?: PurchasesPackage) => {
      const configured = ensureRevenueCatConfigured();
      if (!configured) {
        throw new Error("RevenueCat API keys are not configured.");
      }

      const packageToBuy =
        selectedPackage ?? currentOffering?.availablePackages[0];
      if (!packageToBuy) {
        throw new Error("No purchasable packages are available at the moment.");
      }

      try {
        setLoading(true);
        const { customerInfo: info } =
          await Purchases.purchasePackage(packageToBuy);
        setCustomerInfo(info);
        await fetchOfferings();
        await refreshEntitlements().catch(() => undefined);
        return hasActiveEntitlement(info);
      } catch (error: any) {
        if (error?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
          return false;
        }
        console.error("[RevenueCat] Purchase failed", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [currentOffering, fetchOfferings, refreshEntitlements],
  );

  const restorePurchases = useCallback(async () => {
    const configured = ensureRevenueCatConfigured();
    if (!configured) return false;
    try {
      setLoading(true);
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      await fetchOfferings();
      await refreshEntitlements().catch(() => undefined);
      return hasActiveEntitlement(info);
    } catch (error) {
      console.error("[RevenueCat] Restore failed", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchOfferings, refreshEntitlements]);

  const setDeveloperMode = useCallback(
    async (enabled: boolean) => {
      try {
        setDeveloperModeLoading(true);
        const entitlement = await apiClient.setDeveloperMode(enabled);
        setBackendEntitlement(entitlement);
        await invalidatePremiumQueries();
        return entitlement.isPro;
      } finally {
        setDeveloperModeLoading(false);
      }
    },
    [invalidatePremiumQueries],
  );

  const revenueCatActive = useMemo(
    () => hasActiveEntitlement(customerInfo),
    [customerInfo],
  );
  const isPro = Boolean(backendEntitlement?.isPro || revenueCatActive);
  const paidActive = Boolean(backendEntitlement?.paidActive || revenueCatActive);
  const bypassActive = Boolean(backendEntitlement?.bypassActive);
  const developerModeEnabled = Boolean(
    backendEntitlement?.developerModeEnabled,
  );
  const canUseDeveloperMode = Boolean(backendEntitlement?.canUseDeveloperMode);
  const packages = useMemo(
    () => currentOffering?.availablePackages ?? [],
    [currentOffering],
  );

  const openPaywall = (reason?: string) => {
    router.push({
      pathname: "/paywall",
      params: reason ? { reason } : undefined,
    });
  };

  return (
    <PremiumContext.Provider
      value={{
        isPro,
        paidActive,
        bypassActive,
        developerModeEnabled,
        canUseDeveloperMode,
        loading: loading || entitlementLoading || developerModeLoading,
        customerInfo,
        packages,
        currentOffering,
        upgradeToPro,
        restorePurchases,
        refreshEntitlements,
        setDeveloperMode,
        openPaywall,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
};

export const usePremium = (): PremiumContextType => {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error("usePremium must be used within PremiumProvider");
  return ctx;
};

export default PremiumProvider;
