import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "expo-router";
import Purchases, {
  CustomerInfo,
  CustomerInfoUpdateListener,
  PurchasesErrorCode,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";
import { useGlobalContext } from "@/lib/GlobalContext";
import {
  ensureRevenueCatConfigured,
  hasActiveEntitlement,
} from "./revenuecat";

type PremiumContextType = {
  isPro: boolean;
  loading: boolean;
  customerInfo: CustomerInfo | null;
  packages: PurchasesPackage[];
  currentOffering: PurchasesOffering | null;
  upgradeToPro: (selectedPackage?: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  openPaywall: (reason?: string) => void;
};

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export const PremiumProvider = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useGlobalContext();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [userResolved, setUserResolved] = useState(false);
  const router = useRouter();

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
    let cancelled = false;
    const identify = async () => {
      if (!userResolved) return;
      const configured = ensureRevenueCatConfigured();
      if (!configured) return;

      try {
        if (currentUser?.$id) {
          const { customerInfo: info } = await Purchases.logIn(currentUser.$id);
          if (!cancelled) {
            setCustomerInfo(info);
          }
        } else {
          await Purchases.logOut();
          if (!cancelled) {
            const info = await Purchases.getCustomerInfo();
            setCustomerInfo(info);
          }
        }
      } catch (error) {
        console.warn("[RevenueCat] Unable to sync user identity", error);
      }
    };

    identify();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.$id, userResolved]);

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
        const { customerInfo: info } = await Purchases.purchasePackage(packageToBuy);
        setCustomerInfo(info);
        await fetchOfferings();
        return hasActiveEntitlement(info);
      } catch (error: any) {
        if (error?.code === PurchasesErrorCode.PurchaseCancelledError) {
          return false;
        }
        console.error("[RevenueCat] Purchase failed", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [currentOffering, fetchOfferings]
  );

  const restorePurchases = useCallback(async () => {
    const configured = ensureRevenueCatConfigured();
    if (!configured) return false;
    try {
      setLoading(true);
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      await fetchOfferings();
      return hasActiveEntitlement(info);
    } catch (error) {
      console.error("[RevenueCat] Restore failed", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchOfferings]);

  const isPro = useMemo(() => hasActiveEntitlement(customerInfo), [customerInfo]);
  const packages = useMemo(
    () => currentOffering?.availablePackages ?? [],
    [currentOffering]
  );

  const openPaywall = (reason?: string) => {
    router.push({ pathname: "/paywall", params: reason ? { reason } : undefined });
  };

  return (
    <PremiumContext.Provider
      value={{
        isPro,
        loading,
        customerInfo,
        packages,
        currentOffering,
        upgradeToPro,
        restorePurchases,
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
