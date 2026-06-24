import { LeankCard } from "@/components/Cards";
import EmptyLeanks from "@/components/EmptyLeanks";
import NavBar from "@/components/NavBar";
import { LeankCardSkeletonList } from "@/components/SkeletonLoaders";
import { NavbarOptions, Screens } from "@/constants/enums";
import images from "@/constants/images";
import { Leank } from "@/interfaces";
import { useGlobalContext } from "@/lib/GlobalContext";
import { usePremium } from "@/lib/PremiumContext";
import { apiClient } from "@/lib/api/client";
import { Fontisto } from "@expo/vector-icons";
import { LegendList } from "@legendapp/list";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { cssInterop } from "nativewind";
import { useCallback, useMemo, useState } from "react";
import { RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Interop the Image component to recognize the 'className' prop
cssInterop(Image, {
  className: { target: "style" },
});

const PROFILE_PAGE_SIZE = 20;

export default function Profile() {
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{
    nav?: string;
  }>();
  const nav =
    params.nav === NavbarOptions.JOINED || params.nav === NavbarOptions.HOSTED
      ? params.nav
      : NavbarOptions.HOSTED;

  const [refreshing, setRefreshing] = useState(false);
  const [refreshStartedEmpty, setRefreshStartedEmpty] = useState(false);

  const { currentUser } = useGlobalContext();
  const { isPro } = usePremium();
  const currentUserId = currentUser?.id;
  const profileAvatar = currentUser?.avatar ?? "";
  const profileName = currentUser?.name ?? "";
  const isHosted = nav === NavbarOptions.HOSTED;
  const hostedQueryKey = useMemo(
    () => ["leanks", "profile", "hosted", currentUserId] as const,
    [currentUserId],
  );
  const attendedQueryKey = useMemo(
    () => ["leanks", "profile", "attended", currentUserId] as const,
    [currentUserId],
  );
  const countsQuery = useQuery({
    queryKey: ["leanks", "profile", "counts", currentUserId],
    queryFn: apiClient.getProfileLeankCounts,
    enabled: Boolean(currentUserId),
  });
  const hostedQuery = useInfiniteQuery({
    queryKey: hostedQueryKey,
    enabled: Boolean(currentUserId && isHosted),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      apiClient.getHosted({
        limit: PROFILE_PAGE_SIZE,
        cursor: pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });
  const attendedQuery = useInfiniteQuery({
    queryKey: attendedQueryKey,
    enabled: Boolean(currentUserId && !isHosted),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      apiClient.getAttended({
        limit: PROFILE_PAGE_SIZE,
        cursor: pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });
  const usageQuery = useQuery({
    queryKey: ["usage", currentUserId],
    queryFn: apiClient.getUsage,
    enabled: Boolean(currentUserId && !isPro),
  });
  const selectedQuery = isHosted ? hostedQuery : attendedQuery;
  const leanks = useMemo<Leank[]>(() => {
    const seen = new Set<string>();
    return (
      selectedQuery.data?.pages.flatMap((page) => page.items) || []
    ).filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [selectedQuery.data]);
  const leankCounts = {
    hosted: countsQuery.data ? countsQuery.data.hosted : "...",
    attended: countsQuery.data ? countsQuery.data.attended : "...",
  };
  const bonusInterests =
    usageQuery.data?.bonusInterests ?? currentUser?.bonusInterests ?? 0;
  const interestsLeft = usageQuery.data
    ? Math.max(
        0,
        usageQuery.data.limits.interests - usageQuery.data.interestsUsedToday,
      )
    : null;

  const handleNavChange = useCallback(
    (nextNav: NavbarOptions) => {
      if (nextNav === nav) return;
      router.setParams({ nav: nextNav });
    },
    [nav],
  );

  const renderItem = ({ item }: { item: Leank }) => (
    <View className="mx-5 mb-5">
      <LeankCard item={item} />
    </View>
  );

  const listEmptyComponent = () => {
    if (
      (selectedQuery.isPending && leanks.length === 0) ||
      (refreshing && refreshStartedEmpty)
    ) {
      return <LeankCardSkeletonList count={2} />;
    }

    if (selectedQuery.isError) {
      return (
        <View className="h-3/4 items-center justify-center">
          <EmptyLeanks
            onPrimaryAction={() => {
              void selectedQuery.refetch();
            }}
            title="Couldn't load leanks"
            subtitle="Pull to refresh or try again."
            primaryLabel="Retry"
          />
        </View>
      );
    }

    return (
      <View className="h-3/4 items-center justify-center">
        <EmptyLeanks
          onPrimaryAction={() => {
            if (isHosted) {
              router.push("/create");
              return;
            }
            router.push("/(app)/(tabs)");
          }}
          title={isHosted ? "No hosted leanks yet" : "No attended leanks yet"}
          subtitle={
            isHosted ? "" : "When you join a leank, it will show up here."
          }
          primaryLabel={isHosted ? "Create a Leank" : "Explore Leanks"}
        />
      </View>
    );
  };

  const handleRefresh = async () => {
    const wasEmpty = leanks.length === 0;
    try {
      setRefreshStartedEmpty(wasEmpty);
      setRefreshing(true);
      const refreshTasks: Promise<unknown>[] = [
        selectedQuery.refetch(),
        countsQuery.refetch(),
      ];

      if (!isPro) {
        refreshTasks.push(usageQuery.refetch());
      }

      await Promise.all(refreshTasks);
    } catch (e) {
      console.log(e);
    } finally {
      setRefreshing(false);
      setRefreshStartedEmpty(false);
    }
  };

  const handleEndReached = useCallback(() => {
    if (!selectedQuery.hasNextPage || selectedQuery.isFetchingNextPage) return;
    void selectedQuery.fetchNextPage();
  }, [selectedQuery]);

  const listFooterComponent = () => {
    if (selectedQuery.isFetchingNextPage) {
      return <LeankCardSkeletonList count={2} />;
    }

    if (selectedQuery.isFetchNextPageError) {
      return (
        <View className="items-center justify-center py-6">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              void selectedQuery.fetchNextPage();
            }}
            className="rounded-full bg-gray-100 px-5 py-3"
          >
            <Text className="font-plus-jakarta-semibold text-gray-700">
              Retry loading more
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
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
        source={
          profileAvatar ? { uri: profileAvatar } : images.avatarPlaceholder
        }
        className="w-20 h-20 rounded-full"
        contentFit="cover"
      />
      <Text className="font-plus-jakarta-extrabold text-2xl">
        {profileName}
      </Text>
      {!isPro && interestsLeft !== null && (
        <Text className="text-secondary-300 font-plus-jakarta-regular">
          {interestsLeft} interests left today
          {bonusInterests > 0 ? ` (+${bonusInterests} bonus)` : ""}
        </Text>
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
        <NavBar
          screen={Screens.PROFILE}
          value={nav}
          onChange={handleNavChange}
        />
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
        ListFooterComponent={listFooterComponent}
        ListHeaderComponent={listHeaderComponent}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}
