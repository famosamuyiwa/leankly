import { appwriteConfig, db } from "@/appwrite/config";
import { Colors } from "@/constants/common";
import { User } from "@/interfaces";
import { FiltersProvider } from "@/lib/FiltersContext";
import { useGlobalContext } from "@/lib/GlobalContext";
import { useAuth } from "@clerk/clerk-expo";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { setCurrentUser } = useGlobalContext();
  const [isCurrentUserReady, setIsCurrentUserReady] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return;

    let attempts = 0;
    const maxAttempts = 5;

    const checkUser = async () => {
      try {
        const user = await db.getRow({
          databaseId: appwriteConfig.db,
          tableId: appwriteConfig.tables.user,
          rowId: userId,
        });

        if (user) {
          console.log("✅ Appwrite user found:", user.name);
          setCurrentUser(user as unknown as User);
          setIsCurrentUserReady(true);
          return;
        }
      } catch (err) {
        console.warn("⚠️ User not found in Appwrite yet. Retrying...");
      }

      // Retry after delay (max 5 times)
      if (attempts < maxAttempts) {
        attempts++;
        setTimeout(checkUser, 500);
      } else {
        console.error(
          "❌ Failed to find user in Appwrite after multiple attempts"
        );
      }
    };

    checkUser();
  }, [isLoaded, isSignedIn, userId]);

  if (!isLoaded || (isSignedIn && !isCurrentUserReady)) {
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
            <Stack.Protected guard={isSignedIn && isCurrentUserReady}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack.Protected>
            <Stack.Protected guard={!isSignedIn}>
              <Stack.Screen name="sign-in" options={{ headerShown: false }} />
              <Stack.Screen name="mail-auth" options={{ headerShown: false }} />
            </Stack.Protected>
          </Stack>
        </SafeAreaProvider>
      </FiltersProvider>
    </GestureHandlerRootView>
  );
}
