import CustomButton from "@/components/Button";
import { ToastType } from "@/constants/enums";
import { useGlobalContext } from "@/lib/GlobalContext";
import { useAuthSession } from "@/lib/auth/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PasswordRecoveryCallback() {
  const params = useLocalSearchParams<{ userId?: string; secret?: string }>();
  const { completePasswordRecovery } = useAuthSession();
  const { displayToast } = useGlobalContext();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const secret = Array.isArray(params.secret) ? params.secret[0] : params.secret;

  const handleSubmit = async () => {
    if (!userId || !secret) {
      displayToast({
        type: ToastType.ERROR,
        description: "Recovery link is missing required data.",
      });
      return;
    }

    if (!password || password !== confirmPassword) {
      displayToast({
        type: ToastType.ERROR,
        description: "Passwords do not match.",
      });
      return;
    }

    setIsLoading(true);
    try {
      await completePasswordRecovery(userId, secret, password);
      displayToast({
        type: ToastType.SUCCESS,
        description: "Password updated. Sign in with your new password.",
      });
      router.replace("/(app)/sign-in");
    } catch (error: any) {
      displayToast({
        type: ToastType.ERROR,
        description: error?.message || "Unable to reset password",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-6 justify-center">
      <View className="gap-5">
        <View className="gap-2">
          <Text className="font-plus-jakarta-bold text-3xl">
            Reset password
          </Text>
          <Text className="font-plus-jakarta-regular text-gray-500">
            Enter a new password for your Leankly account.
          </Text>
        </View>

        <View className="gap-3">
          <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-4 border border-gray-200">
            <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
            <TextInput
              placeholder="New password"
              secureTextEntry
              value={password}
              autoCapitalize="none"
              placeholderTextColor="#9CA3AF"
              onChangeText={setPassword}
              className="p-0 flex-1 ml-3 text-gray-900"
              editable={!isLoading}
            />
          </View>
          <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-4 border border-gray-200">
            <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
            <TextInput
              placeholder="Confirm password"
              secureTextEntry
              value={confirmPassword}
              autoCapitalize="none"
              placeholderTextColor="#9CA3AF"
              onChangeText={setConfirmPassword}
              className="p-0 flex-1 ml-3 text-gray-900"
              editable={!isLoading}
            />
          </View>
        </View>

        <CustomButton
          label="Update password"
          isLoading={isLoading}
          isDisabled={!password || !confirmPassword}
          onPress={handleSubmit}
        />
      </View>
    </SafeAreaView>
  );
}
