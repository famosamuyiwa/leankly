import { PushNotificationProvider } from "@/lib/PushNotificationContext";
import "./global.css";

import GlobalProvider from "@/lib/GlobalContext";
import PremiumProvider from "@/lib/PremiumContext";
import { currentScreenRef } from "@/lib/ScreenTracker";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

const getNotificationLeankId = (data?: Record<string, unknown>) => {
  const directLeankId = data?.leankId;
  if (typeof directLeankId === "string") return directLeankId;

  const nestedData = data?.data;
  if (nestedData && typeof nestedData === "object") {
    const nestedLeankId = (nestedData as Record<string, unknown>).leankId;
    if (typeof nestedLeankId === "string") return nestedLeankId;
  }

  return undefined;
};

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const current = currentScreenRef.current;
    const leankId = getNotificationLeankId(
      notification.request.content.data as Record<string, unknown> | undefined
    );

    // Suppress foreground chat notifications only when that chat is already open.
    if (leankId && current?.includes(`/messages/${leankId}`)) {
      return {
        shouldShowBanner: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowList: false,
      };
    }

    return {
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
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
    <PushNotificationProvider>
      <GlobalProvider>
        <AuthProvider>
          <PremiumProvider>
            <Slot />
          </PremiumProvider>
        </AuthProvider>
      </GlobalProvider>
    </PushNotificationProvider>
  );
}
