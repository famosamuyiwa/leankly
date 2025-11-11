import GradientText from "@/components/GradientText";
import { usePremium } from "@/lib/PremiumContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export default function PaywallScreen() {
  const { upgradeToPro } = usePremium();
  const router = useRouter();
  const { reason } = useLocalSearchParams<{ reason?: string }>();

  const handleUnlock = async () => {
    await upgradeToPro();
    router.back();
  };

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
        className="bg-black-300 rounded-2xl py-4 items-center"
        activeOpacity={0.7}
        onPress={handleUnlock}
      >
        <Text className="text-white font-plus-jakarta-bold text-lg">
          Unlock Leankly+
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
