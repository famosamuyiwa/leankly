import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { useGlobalContext } from "@/lib/GlobalContext";

type PremiumContextType = {
  isPro: boolean;
  loading: boolean;
  upgradeToPro: () => Promise<void>;
  openPaywall: (reason?: string) => void;
  togglePro: () => Promise<void>;
};

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export const PremiumProvider = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useGlobalContext();
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const storageKey = useMemo(() => {
    const id = currentUser?.$id || "anon";
    // SecureStore keys must be alphanumeric or ".", "-", "_"
    return `premium_${id.replace(/[^A-Za-z0-9._-]/g, "_")}`;
  }, [currentUser?.$id]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const v = await SecureStore.getItemAsync(storageKey);
        if (!mounted) return;
        setIsPro(v === "true");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [storageKey]);

  const upgradeToPro = async () => {
    await SecureStore.setItemAsync(storageKey, "true");
    setIsPro(true);
  };

  const togglePro = async () => {
    const next = !isPro;
    await SecureStore.setItemAsync(storageKey, next ? "true" : "false");
    setIsPro(next);
  };

  const openPaywall = (reason?: string) => {
    router.push({ pathname: "/paywall", params: reason ? { reason } : undefined });
  };

  return (
    <PremiumContext.Provider value={{ isPro, loading, upgradeToPro, openPaywall, togglePro }}>
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
