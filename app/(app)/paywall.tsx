import GradientText from "@/components/GradientText";
import { usePremium } from "@/lib/PremiumContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function PaywallScreen() {
  const { upgradeToPro, packages, loading, restorePurchases } = usePremium();
  const router = useRouter();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const [processing, setProcessing] = useState(false);
  const defaultPackage = packages[0];
  const isBusy = loading || processing;

  const handleUnlock = async () => {
    if (!defaultPackage) {
      Alert.alert(
        "Store unavailable",
        "Subscription products are still loading. Please try again in a moment."
      );
      return;
    }

    try {
      setProcessing(true);
      const success = await upgradeToPro(defaultPackage);
      if (success) {
        router.back();
      }
    } catch (error: any) {
      console.log("error: ", error);
      Alert.alert(
        "Purchase failed",
        "We couldn't complete the purchase. Try again later."
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setProcessing(true);
      const restored = await restorePurchases();
      if (restored) {
        router.back();
        return;
      }
      Alert.alert(
        "No purchases found",
        "We couldn't find an active subscription for this account."
      );
    } catch (error: any) {
      Alert.alert(
        "Restore failed",
        error?.message || "Something went wrong. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  };

  const priceLabel = defaultPackage?.product?.priceString
    ? `Unlock for ${defaultPackage.product.priceString}`
    : "Unlock Leankly+";

  return (
    <View className="flex-1 bg-white px-6 pt-20">
      <GradientText
        style={{
          fontSize: 22,
          textAlign: "center",
          fontFamily: "PlusJakartaSans-ExtraBold",
          marginBottom: 30,
        }}
      >
        Leankly+
      </GradientText>

      <View className="mt-4 mb-8 gap-4">
        <View className="flex-row items-center gap-3">
          <Ionicons name="infinite" size={20} color="#111" />
          <Text className="text-base font-plus-jakarta-medium">
            Unlimited interests
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <Ionicons name="filter" size={20} color="#111" />
          <Text className="text-base font-plus-jakarta-medium">
            Access all filters
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <Ionicons name="return-down-back" size={20} color="#111" />
          <Text className="text-base font-plus-jakarta-medium">
            Rewind unlimited times
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <Ionicons name="list" size={20} color="#111" />
          <Text className="text-base font-plus-jakarta-medium">
            See all requests at once
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <MaterialCommunityIcons name="medal" size={20} color="#111" />
          <Text className="text-base font-plus-jakarta-medium">
            Make your requests stand out
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <MaterialCommunityIcons
            name="advertisements"
            size={20}
            color="#111"
          />
          <Text className="text-base font-plus-jakarta-medium">
            Get rid of ads
          </Text>
        </View>
      </View>

      <TouchableOpacity
        className={`rounded-2xl py-4 items-center ${isBusy ? "bg-gray-300" : "bg-black-300"}`}
        activeOpacity={0.7}
        disabled={isBusy}
        onPress={handleUnlock}
      >
        {isBusy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-plus-jakarta-bold text-lg">
            {priceLabel}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        className="mt-4 items-center"
        activeOpacity={0.7}
        onPress={handleRestore}
        disabled={isBusy}
      >
        <Text className="text-gray-600 font-plus-jakarta-medium">
          Restore purchases
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="mt-4 items-center"
        activeOpacity={0.7}
        onPress={() => router.back()}
      >
        <Text className="text-gray-500 font-plus-jakarta-medium">
          Maybe later
        </Text>
      </TouchableOpacity>
    </View>
  );
}
