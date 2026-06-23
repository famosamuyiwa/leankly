import { PushNotificationProvider } from "@/lib/PushNotificationContext";
import "./global.css";

import { GlobalProvider } from "@/lib/GlobalContext";
import { PremiumProvider } from "@/lib/PremiumContext";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { SUPPRESS_FOREGROUND_NOTIFICATION } from "@/lib/notificationBehavior";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

Notifications.setNotificationHandler({
  handleNotification: async () => SUPPRESS_FOREGROUND_NOTIFICATION,
});

SplashScreen.preventAutoHideAsync();

export default function Layout() {
  SplashScreen.setOptions({
    duration: 1000,
    fade: true,
  });

  const [fontsLoaded] = useFonts({
    "Plus-Jakarta-Regular": require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
    "Plus-Jakarta-Medium": require("../assets/fonts/PlusJakartaSans-Medium.ttf"),
    "Plus-Jakarta-Light": require("../assets/fonts/PlusJakartaSans-Light.ttf"),
    "Plus-Jakarta-ExtraLight": require("../assets/fonts/PlusJakartaSans-ExtraLight.ttf"),
    "Plus-Jakarta-Bold": require("../assets/fonts/PlusJakartaSans-Bold.ttf"),
    "Plus-Jakarta-SemiBold": require("../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    "Plus-Jakarta-ExtraBold": require("../assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
  });

  useEffect(() => {
    const init = async () => {
      if (fontsLoaded) {
        await SplashScreen.hideAsync();
      }
    };

    init();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;
  return (
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
  );
}
