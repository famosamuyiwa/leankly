import { LeankCard } from "@/components/Cards";
import NavBar from "@/components/NavBar";
import { dummyLeanks } from "@/constants/data";
import { Screens } from "@/constants/enums";
import { Leank } from "@/interfaces";
import { useProfileContext } from "@/lib/ProfileContext";
import { Fontisto } from "@expo/vector-icons";
import { LegendList } from "@legendapp/list";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { cssInterop } from "nativewind";
import React, { useCallback } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Profile() {
  const insets = useSafeAreaInsets();

  if (!insets) {
    return null; // Prevents glitching by waiting for insets
  }

  // Interop the Image component to recognize the 'className' prop
  cssInterop(Image, {
    className: { target: "style" },
  });

  const params = useLocalSearchParams<{
    nav?: string;
  }>();

  const { avatar, name } = useProfileContext();

  const renderItem = useCallback(
    ({ item }: { item: Leank }) => (
      <View className="mx-5 mb-5">
        <LeankCard item={item} />
      </View>
    ),
    []
  );

  const loadMore = useCallback(() => {}, []);

  const listEmptyComponent = useCallback(() => {
    return (
      <View className="justify-center items-center mt-10">
        <Text className="font-plus-jakarta-semibold color-gray-400">
          No leanks yet.
        </Text>
      </View>
    );
  }, []);

  const listHeaderComponent = useCallback(
    () => (
      <View className="gap-4 px-5 mb-5">
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={() => router.navigate("/(app)/(tabs)/profile/(settings)")}
        >
          <Fontisto
            name="player-settings"
            className="absolute self-end pt-10"
            size={30}
          />
        </TouchableOpacity>
        <Image
          source={avatar}
          className="w-20 h-20 rounded-full"
          contentFit="cover"
        />
        <Text className="font-plus-jakarta-extrabold text-2xl">{name}</Text>
        <View className="flex-row gap-5">
          <Text className="color-gray-400">
            <Text className="color-black font-plus-jakarta-bold">3</Text> Hosted
          </Text>
          <Text className="color-gray-400">
            <Text className="color-black font-plus-jakarta-bold">1</Text>{" "}
            Attended
          </Text>
        </View>

        <View className="px-5">
          <NavBar screen={Screens.PROFILE} />
        </View>
      </View>
    ),
    [avatar, name]
  );

  return (
    <Animated.View
      layout={LinearTransition}
      entering={FadeIn.duration(500)}
      className="flex flex-1 bg-white"
    >
      {/* Recent Activities */}
      <LegendList
        data={dummyLeanks}
        keyExtractor={(item) => item.$id.toString()}
        numColumns={1}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        ListHeaderComponent={listHeaderComponent}
        ListEmptyComponent={listEmptyComponent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        scrollEventThrottle={16}
      />
    </Animated.View>
  );
}
