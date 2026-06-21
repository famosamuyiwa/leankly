import { Colors } from "@/constants/common";
import { FiltersProvider } from "@/lib/FiltersContext";
import { useGlobalContext } from "@/lib/GlobalContext";
import { useAuthSession } from "@/lib/auth/AuthContext";
import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  const { isLoading, isAuthenticated, isEmailVerified } = useAuthSession();
  const { currentUser } = useGlobalContext();
  const router = useRouter();
  const pathname = usePathname();
  const isCurrentUserReady = !!currentUser;
  const canEnterApp = isAuthenticated && isEmailVerified && isCurrentUserReady;

  // Redirect new/incomplete users to onboarding
  useEffect(() => {
    if (!canEnterApp) return;
    if (!currentUser) return;

    const hasName =
      typeof currentUser?.name === "string" &&
      currentUser.name.trim().length >= 2;
    const hasAge =
      typeof currentUser?.age === "number" &&
      Number.isFinite(currentUser.age) &&
      currentUser.age > 0;
    const hasLocation =
      typeof currentUser?.location === "string" &&
      currentUser.location.trim().length > 0;
    const hasCoords =
      typeof currentUser?.locationLat === "number" &&
      typeof currentUser?.locationLng === "number" &&
      currentUser.locationLat !== null &&
      currentUser.locationLng != null;

    const needsOnboarding = !(hasName && hasAge && hasLocation && hasCoords);

    if (needsOnboarding && pathname !== "/(app)/onboarding") {
      router.replace("/(app)/onboarding");
    }

    if (!needsOnboarding && pathname === "/(app)/onboarding") {
      router.replace("/(app)/(tabs)");
    }
  }, [
    canEnterApp,
    currentUser?.name,
    currentUser?.age,
    currentUser?.location,
    currentUser,
    pathname,
    router,
  ]);

  if (isLoading || (isAuthenticated && !isCurrentUserReady)) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FiltersProvider>
        <SafeAreaProvider>
          <Stack>
            <Stack.Protected guard={canEnterApp}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="paywall" options={{ headerShown: false }} />
              <Stack.Screen
                name="onboarding"
                options={{
                  headerShadowVisible: false,
                  headerShown: false,
                }}
              />
            </Stack.Protected>
            <Stack.Protected guard={!canEnterApp}>
              <Stack.Screen name="sign-in" options={{ headerShown: false }} />
              <Stack.Screen name="mail-auth" options={{ headerShown: false }} />
            </Stack.Protected>
          </Stack>
        </SafeAreaProvider>
      </FiltersProvider>
    </GestureHandlerRootView>
  );
}
