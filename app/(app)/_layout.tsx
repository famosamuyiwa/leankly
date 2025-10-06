import { Colors } from "@/constants/common";
import GlobalProvider from "@/lib/GlobalContext";
import { useAuth } from "@clerk/clerk-expo";
import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GlobalProvider>
        <SafeAreaProvider>
          <Stack>
            <Stack.Protected guard={isSignedIn}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack.Protected>
            <Stack.Protected guard={!isSignedIn}>
              <Stack.Screen name="sign-in" options={{ headerShown: false }} />
              <Stack.Screen name="mail-auth" options={{ headerShown: false }} />
            </Stack.Protected>
          </Stack>
        </SafeAreaProvider>
      </GlobalProvider>
    </GestureHandlerRootView>
  );
}
