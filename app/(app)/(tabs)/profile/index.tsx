import { appwriteConfig, db } from "@/appwrite/config";
import { LeankCard } from "@/components/Cards";
import EmptyLeanks from "@/components/EmptyLeanks";
import NavBar from "@/components/NavBar";
import { NavbarOptions, Screens } from "@/constants/enums";
import { Leank } from "@/interfaces";
import { useGlobalContext } from "@/lib/GlobalContext";
import { usePremium } from "@/lib/PremiumContext";
import { useProfileContext } from "@/lib/ProfileContext";
import { FreeLimits, getCount } from "@/lib/featureGates";
import { Fontisto } from "@expo/vector-icons";
import { LegendList } from "@legendapp/list";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { cssInterop } from "nativewind";
import React, { memo, useEffect, useMemo, useState } from "react";
import { RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { Query } from "react-native-appwrite";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Profile() {
  const insets = useSafeAreaInsets();

  // Interop the Image component to recognize the 'className' prop
  cssInterop(Image, {
    className: { target: "style" },
  });

  const params = useLocalSearchParams<{
    nav?: string;
  }>();
  const nav = params.nav ?? NavbarOptions.HOSTED;

  const [refreshing, setRefreshing] = useState(false);

  const { avatar, name } = useProfileContext();
  const { currentUser } = useGlobalContext();
  const { isPro, togglePro } = usePremium();
  const [leanks, setLeanks] = useState<Leank[]>([]);
  const [leankCounts, setLeankCounts] = useState({
    hosted: 0,
    attended: 0,
  });
  const [interestsLeft, setInterestsLeft] = useState<number | null>(null);

  useEffect(() => {
    getLeankDetails();
  }, [nav]);

  useEffect(() => {
    getLeankCounts();
  }, []);

  useEffect(() => {
    const loadInterestsLeft = async () => {
      if (!currentUser?.$id || isPro) {
        setInterestsLeft(null);
        return;
      }
      const used = await getCount(currentUser.$id, "interest");
      const left = Math.max(0, FreeLimits.INTERESTS_PER_DAY - used);
      setInterestsLeft(left);
    };
    loadInterestsLeft();
  }, [currentUser?.$id, currentUser?.referralCount, isPro]);

  const renderItem = memo(({ item }: { item: Leank }) => (
    <View className="mx-5 mb-5">
      <LeankCard item={item} />
    </View>
  ));

  const loadMore = () => {};

  const listEmptyComponent = memo(() => {
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
  });

  const getLeankCounts = async () => {
    if (!currentUser) return;

    try {
      // Hosted
      const hosted = await db.listRows({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.leanks,
        queries: [Query.equal("ownerId", currentUser?.$id)],
      });

      // Attended
      const attended = await db.listRows({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.leanks,
        queries: [Query.contains("participantIds", currentUser?.$id)],
      });

      setLeankCounts({
        hosted: hosted.total ?? hosted.rows.length,
        attended: attended.total ?? attended.rows.length,
      });
    } catch (e) {
      console.error("Error counting leanks:", e);
    }
  };

  const getLeankDetails = async () => {
    if (!currentUser) return;

    try {
      const queries = [
        Query.limit(10),
        Query.select([
          "cover",
          "title",
          "date",
          "time",
          "ownerId",
          "location",
          "participantIds",
        ]),
      ];

      if (nav === NavbarOptions.HOSTED) {
        queries.push(Query.equal("ownerId", currentUser.$id));
      } else {
        queries.push(Query.contains("participantIds", currentUser.$id));
      }

      const { rows, total } = await db.listRows({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.leanks,
        queries,
      });
      setLeanks(rows as unknown as Leank[]);
    } catch (e) {
      console.log(e);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await getLeankDetails();
      await getLeankCounts();
    } catch (e) {
      console.log(e);
    } finally {
      setRefreshing(false);
    }
  };

  const listHeaderComponent = useMemo(
    () => (
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
        <View className="flex-row items-center gap-3">
          {!isPro && interestsLeft !== null && (
            <Text className="text-secondary-300 font-plus-jakarta-regular">
              {interestsLeft} interests left today
              {currentUser?.bonusInterests && currentUser.bonusInterests > 0
                ? ` (+${currentUser.bonusInterests} bonus)`
                : ""}
            </Text>
          )}
          <TouchableOpacity
            onPress={togglePro}
            activeOpacity={0.7}
            className={`${isPro ? "bg-green-500" : "bg-gray-200"} px-3 py-1 rounded-xl`}
          >
            <Text
              className={`${isPro ? "text-white" : "text-black"} font-plus-jakarta-semibold`}
            >
              Pro: {isPro ? "On" : "Off"}
            </Text>
          </TouchableOpacity>
        </View>
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
    ),
    [avatar, name, leankCounts, isPro, interestsLeft]
  );

  if (!insets) {
    return null; // Prevents glitching by waiting for insets
  }

  return (
    <Animated.View
      layout={LinearTransition}
      entering={FadeIn.duration(500)}
      className="flex flex-1 bg-white"
    >
      <LegendList<Leank>
        data={leanks}
        renderItem={renderItem}
        keyExtractor={(i) => i.$id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={listEmptyComponent}
        ListHeaderComponent={listHeaderComponent}
      />
    </Animated.View>
  );
}
