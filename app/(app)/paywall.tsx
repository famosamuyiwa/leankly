import { Colors } from "@/constants/common";
import { mascotPoses } from "@/constants/data";
import images from "@/constants/images";
import { usePremium } from "@/lib/PremiumContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { cssInterop } from "nativewind";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function PaywallScreen() {
  const { upgradeToPro, packages, loading, restorePurchases } = usePremium();
  const router = useRouter();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const [processing, setProcessing] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null
  );
  const defaultPackage = packages[0];
  const isBusy = loading || processing;
  // Interop the Image component to recognize the 'className' prop
  cssInterop(Image, {
    className: { target: "style" },
  });

  useEffect(() => {
    if (!selectedPackageId && defaultPackage?.identifier) {
      setSelectedPackageId(defaultPackage.identifier);
    }
  }, [defaultPackage?.identifier, selectedPackageId]);

  const selectedPackage = useMemo(() => {
    if (!packages.length) return undefined;
    const found = packages.find((pkg) => pkg.identifier === selectedPackageId);
    return found ?? packages[0];
  }, [packages, selectedPackageId]);

  const highlightedPackageId = useMemo(() => {
    const monthly = packages.find((pkg) =>
      pkg.identifier?.toLowerCase().includes("month")
    );
    return monthly?.identifier ?? packages[packages.length - 1]?.identifier;
  }, [packages]);

  const getPlanLabel = (pkgIdentifier?: string) => {
    const id = pkgIdentifier?.toLowerCase() ?? "";
    if (id.includes("week")) return "Weekly plan";
    if (id.includes("month")) return "Monthly plan";
    if (id.includes("year")) return "Yearly plan";
    return "Subscription";
  };

  const getBillingCopy = (pkgIdentifier?: string) => {
    const label = getPlanLabel(pkgIdentifier);
    if (label === "Subscription") return "Recurring billing";
    return `Billed ${label.split(" ")[0].toLowerCase()}`;
  };

  const handleUnlock = async () => {
    if (!selectedPackage) {
      Alert.alert(
        "Store unavailable",
        "Subscription products are still loading. Please try again in a moment."
      );
      return;
    }

    try {
      setProcessing(true);
      const success = await upgradeToPro(selectedPackage);
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

  const priceLabel = selectedPackage?.product?.priceString
    ? `Unlock for ${selectedPackage.product.priceString}`
    : "Unlock Leankly+";

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      bounces={false}
      className="bg-white"
    >
      <View className="h-[25%]">
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.9)"]}
          style={styles.overlay}
          start={{ x: 0.5, y: 0 }} // top center
          end={{ x: 0.5, y: 1 }} // bottom center
        />

        <Image source={images.leanklyPlusHeader} className="h-full " />
        <Text className="text-white absolute z-10 self-center font-plus-jakarta-extrabold bottom-5 text-3xl">
          Leankly+
        </Text>
      </View>
      <View className="flex-1 px-6">
        <Image
          source={{ uri: mascotPoses.POWER_UP }}
          className="h-60 w-full absolute -right-24 top-5"
          contentFit="cover"
        />

        <View className="mt-4 mb-8 gap-2">
          <View className="flex-row items-center gap-3">
            <View className="flex flex-row items-center justify-center bg-secondary-100 rounded-full size-10">
              <Ionicons name="infinite" size={20} color={Colors.accent} />
            </View>
            <Text className="text-base font-plus-jakarta-medium">
              Unlimited interests
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <View className="flex flex-row items-center justify-center bg-secondary-100 rounded-full size-10">
              <Ionicons name="filter" size={20} color={Colors.accent} />
            </View>
            <Text className="text-base font-plus-jakarta-medium">
              Access all filters
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <View className="flex flex-row items-center justify-center bg-secondary-100 rounded-full size-10">
              <Ionicons
                name="return-down-back"
                size={20}
                color={Colors.accent}
              />
            </View>
            <Text className="text-base font-plus-jakarta-medium">
              Rewind unlimited times
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <View className="flex flex-row items-center justify-center bg-secondary-100 rounded-full size-10">
              <Ionicons name="list" size={20} color={Colors.accent} />
            </View>
            <Text className="text-base font-plus-jakarta-medium">
              See all requests at once
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <View className="flex flex-row items-center justify-center bg-secondary-100 rounded-full size-10">
              <MaterialCommunityIcons name="medal" color={Colors.accent} />
            </View>
            <Text className="text-base font-plus-jakarta-medium">
              Make your requests stand out
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <View className="flex flex-row items-center justify-center bg-secondary-100 rounded-full size-10">
              <MaterialCommunityIcons
                name="advertisements"
                size={20}
                color={Colors.accent}
              />
            </View>
            <Text className="text-base font-plus-jakarta-medium">
              Get rid of ads
            </Text>
          </View>
        </View>

        <View className="mb-8">
          <Text className="text-xs font-plus-jakarta-medium uppercase text-gray-500">
            Choose your plan
          </Text>
          <View className="mt-3 gap-3">
            {packages.length ? (
              packages.map((pkg) => {
                const isSelected =
                  pkg.identifier === selectedPackage?.identifier;
                const isHighlighted = pkg.identifier === highlightedPackageId;
                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    className={`rounded-2xl border px-4 py-3 ${isSelected ? "border-black-300 bg-black-300/5" : "border-gray-200 bg-white"}`}
                    disabled={isBusy}
                    onPress={() => setSelectedPackageId(pkg.identifier)}
                    activeOpacity={0.9}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text
                        className={`text-sm font-plus-jakarta-semibold ${isSelected ? "text-black-300" : "text-gray-600"}`}
                      >
                        {getPlanLabel(pkg.identifier)}
                      </Text>
                      {isHighlighted ? (
                        <View className="rounded-full bg-black-300/10 px-2 py-0.5">
                          <Text className="text-[10px] font-plus-jakarta-bold text-black-300">
                            Most Popular
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className="mt-1 text-2xl font-plus-jakarta-bold text-black-300">
                      {pkg.product?.pricePerWeekString ?? "--"}/wk
                    </Text>
                    <Text className="text-xs font-plus-jakarta-medium text-gray-500">
                      {getBillingCopy(pkg.identifier)}
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View className="rounded-2xl border border-dashed border-gray-200 px-4 py-3">
                <Text className="text-sm font-plus-jakarta-medium text-gray-500">
                  Subscription options will appear here shortly.
                </Text>
              </View>
            )}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0, // full screen
    zIndex: 10,
  },
});
