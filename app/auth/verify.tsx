import { Colors } from "@/constants/common";
import { ToastType } from "@/constants/enums";
import { useGlobalContext } from "@/lib/GlobalContext";
import { useAuthSession } from "@/lib/auth/AuthContext";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export default function VerifyEmailCallback() {
  const params = useLocalSearchParams<{ userId?: string; secret?: string }>();
  const { completeEmailVerification } = useAuthSession();
  const { displayToast } = useGlobalContext();

  useEffect(() => {
    const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
    const secret = Array.isArray(params.secret) ? params.secret[0] : params.secret;

    const finish = async () => {
      if (!userId || !secret) {
        displayToast({
          type: ToastType.ERROR,
          description: "Verification link is missing required data.",
        });
        router.replace("/(app)/sign-in");
        return;
      }

      try {
        await completeEmailVerification(userId, secret);
        displayToast({
          type: ToastType.SUCCESS,
          description: "Email verified.",
        });
        router.replace("/");
      } catch (error: any) {
        displayToast({
          type: ToastType.ERROR,
          description: error?.message || "Unable to verify email",
        });
        router.replace("/(app)/sign-in");
      }
    };

    void finish();
  }, [completeEmailVerification, displayToast, params.secret, params.userId]);

  return (
    <View className="flex-1 items-center justify-center bg-white gap-3">
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text className="font-plus-jakarta-semibold text-gray-500">
        Verifying email
      </Text>
    </View>
  );
}
