import { saveUserToDB } from "@/appwrite/actions/user.actions";
import { Colors } from "@/constants/common";
import { usePushNotification } from "@/lib/PushNotificationContext";
import { useUser } from "@clerk/clerk-expo";
import { useEffect } from "react";
import { ActivityIndicator } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

export default function ExpoAuthSessionRedirect() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { expoPushToken } = usePushNotification();

  useEffect(() => {
    if (!isLoaded) return; // Clerk still loading
    if (!isSignedIn || !user) return; // No valid session yet

    const save = async () => await saveUserToDB(user, expoPushToken);
    save();
  }, [isLoaded, isSignedIn, user, expoPushToken]);

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(500)}
      className="flex-1 items-center justify-center"
    >
      <ActivityIndicator size="large" color={Colors.primary} />
    </Animated.View>
  );
}
