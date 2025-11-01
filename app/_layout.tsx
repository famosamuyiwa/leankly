import { PushNotificationProvider } from "@/lib/PushNotificationContext";
import "./global.css";

import GlobalProvider from "@/lib/GlobalContext";
import { currentScreenRef } from "@/lib/ScreenTracker";
import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const current = currentScreenRef.current;
    const { leankId } = notification.request.content.data;

    // Example: suppress notifications on Leank screens
    if (current?.includes(`/messages/${leankId}`)) {
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
    <ClerkProvider tokenCache={tokenCache}>
      <PushNotificationProvider>
        <GlobalProvider>
          <Slot />
        </GlobalProvider>
      </PushNotificationProvider>
    </ClerkProvider>
  );
}
