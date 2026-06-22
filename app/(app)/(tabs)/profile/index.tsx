import { LeankCard } from "@/components/Cards";
import EmptyLeanks from "@/components/EmptyLeanks";
import NavBar from "@/components/NavBar";
import { NavbarOptions, Screens } from "@/constants/enums";
import { Leank } from "@/interfaces";
import { useGlobalContext } from "@/lib/GlobalContext";
import { usePremium } from "@/lib/PremiumContext";
import { useProfileContext } from "@/lib/ProfileContext";
import { apiClient } from "@/lib/api/client";
import { Fontisto } from "@expo/vector-icons";
import { LegendList } from "@legendapp/list";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { cssInterop } from "nativewind";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Interop the Image component to recognize the 'className' prop
cssInterop(Image, {
  className: { target: "style" },
});

export default function Profile() {
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{
    nav?: string;
  }>();
  const nav = params.nav ?? NavbarOptions.HOSTED;

  const [refreshing, setRefreshing] = useState(false);

  const { avatar, name } = useProfileContext();
  const { currentUser } = useGlobalContext();
  const { isPro, openPaywall } = usePremium();
  const hostedQuery = useQuery({
    queryKey: ["leanks", "hosted", currentUser?.id],
    queryFn: apiClient.getHosted,
    enabled: Boolean(currentUser),
  });
  const attendedQuery = useQuery({
    queryKey: ["leanks", "attended", currentUser?.id],
    queryFn: apiClient.getAttended,
    enabled: Boolean(currentUser),
  });
  const usageQuery = useQuery({
    queryKey: ["usage", currentUser?.id],
    queryFn: apiClient.getUsage,
    enabled: Boolean(currentUser && !isPro),
  });
  const leanks =
    nav === NavbarOptions.HOSTED
      ? hostedQuery.data?.items || []
      : attendedQuery.data?.items || [];
  const leankCounts = {
    hosted: hostedQuery.data?.items.length || 0,
    attended: attendedQuery.data?.items.length || 0,
  };
  const interestsLeft = usageQuery.data
    ? Math.max(
        0,
        usageQuery.data.limits.interests - usageQuery.data.interestsUsedToday,
      )
    : null;

  const renderItem = ({ item }: { item: Leank }) => (
    <View className="mx-5 mb-5">
      <LeankCard item={item} />
    </View>
  );

  const listEmptyComponent = () => {
    return (
      <View className="h-3/4 items-center justify-center">
        <EmptyLeanks
          onPrimaryAction={() => router.push("/create")}
          title="No leanks yet"
          subtitle=""
          primaryLabel="Create a Leank"
        />
      </View>
    );
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        hostedQuery.refetch(),
        attendedQuery.refetch(),
        usageQuery.refetch(),
      ]);
    } catch (e) {
      console.log(e);
    } finally {
      setRefreshing(false);
    }
  };

  const listHeaderComponent = (
    <View className="gap-4 px-5 my-5">
      <TouchableOpacity
        activeOpacity={0.6}
        className="p-5 absolute self-end "
        onPress={() => router.navigate("/(app)/(tabs)/profile/(settings)")}
      >
        <Fontisto name="player-settings" size={30} />
      </TouchableOpacity>
      <Image
        source={{ uri: avatar }}
        className="w-20 h-20 rounded-full"
        contentFit="cover"
      />
      <Text className="font-plus-jakarta-extrabold text-2xl">{name}</Text>
      {!isPro && (
        <View className="flex-row items-center gap-3 flex-wrap">
          {interestsLeft !== null && (
            <Text className="text-secondary-300 font-plus-jakarta-regular">
              {interestsLeft} interests left today
              {currentUser?.bonusInterests && currentUser.bonusInterests > 0
                ? ` (+${currentUser.bonusInterests} bonus)`
                : ""}
            </Text>
          )}
          <TouchableOpacity
            onPress={async () => openPaywall("Unlock Leankly+")}
            activeOpacity={0.7}
            className={"bg-black px-4 py-2 rounded-xl"}
          >
            <Text className="text-white font-plus-jakarta-semibold">
              Unlock Leankly+
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <View className="flex-row gap-5">
        <Text className="color-gray-400">
          <Text className="color-black font-plus-jakarta-bold">
            {leankCounts.hosted}
          </Text>{" "}
          Hosted
        </Text>
        <Text className="color-gray-400">
          <Text className="color-black font-plus-jakarta-bold">
            {leankCounts.attended}
          </Text>{" "}
          Attended
        </Text>
      </View>

      <View className="px-5">
        <NavBar screen={Screens.PROFILE} />
      </View>
    </View>
  );

  if (!insets) {
    return null; // Prevents glitching by waiting for insets
  }

  return (
    <View className="flex flex-1 bg-white">
      <LegendList<Leank>
        data={leanks}
        renderItem={renderItem}
        keyExtractor={(i) => i.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={listEmptyComponent}
        ListHeaderComponent={listHeaderComponent}
      />
    </View>
  );
}
