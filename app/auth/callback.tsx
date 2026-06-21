import { Colors } from "@/constants/common";
import { ToastType } from "@/constants/enums";
import { useGlobalContext } from "@/lib/GlobalContext";
import { useAuthSession } from "@/lib/auth/AuthContext";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export default function AuthCallback() {
  const { refreshSession } = useAuthSession();
  const { displayToast } = useGlobalContext();

  useEffect(() => {
    const finish = async () => {
      try {
        await refreshSession();
        router.replace("/");
      } catch (error: any) {
        displayToast({
          type: ToastType.ERROR,
          description: error?.message || "Unable to complete sign in",
        });
        router.replace("/(app)/sign-in");
      }
    };

    void finish();
  }, [displayToast, refreshSession]);

  return (
    <View className="flex-1 items-center justify-center bg-white gap-3">
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text className="font-plus-jakarta-semibold text-gray-500">
        Finishing sign in
      </Text>
    </View>
  );
}
