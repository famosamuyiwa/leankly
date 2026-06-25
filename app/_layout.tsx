import { PushNotificationProvider } from "@/lib/PushNotificationContext";
import "./global.css";

import { GlobalProvider } from "@/lib/GlobalContext";
import { PremiumProvider } from "@/lib/PremiumContext";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { SUPPRESS_FOREGROUND_NOTIFICATION } from "@/lib/notificationBehavior";
import { queryClient } from "@/lib/queryClient";
import { loadStartupAssets } from "@/constants/preloaded-assets";
import { QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => SUPPRESS_FOREGROUND_NOTIFICATION,
});

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

export default function Layout() {
  const [startupAssetsLoaded, setStartupAssetsLoaded] = useState(false);
  const splashHiddenRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const prepareStartupAssets = async () => {
      try {
        await loadStartupAssets();
      } catch (error) {
        console.error("Failed to preload startup assets", error);
      } finally {
        if (isMounted) {
          setStartupAssetsLoaded(true);
        }
      }
    };

    prepareStartupAssets();

    return () => {
      isMounted = false;
    };
  }, []);

  const hideSplashOnLayout = useCallback(() => {
    if (!startupAssetsLoaded || splashHiddenRef.current) return;

    splashHiddenRef.current = true;
    SplashScreen.hideAsync().catch((error) => {
      console.warn("Failed to hide splash screen", error);
    });
  }, [startupAssetsLoaded]);

  if (!startupAssetsLoaded) return null;
  return (
    <View style={{ flex: 1 }} onLayout={hideSplashOnLayout}>
      <QueryClientProvider client={queryClient}>
        <PushNotificationProvider>
          <GlobalProvider>
            <AuthProvider>
              <PremiumProvider>
                <Slot />
              </PremiumProvider>
            </AuthProvider>
          </GlobalProvider>
        </PushNotificationProvider>
      </QueryClientProvider>
    </View>
  );
}
