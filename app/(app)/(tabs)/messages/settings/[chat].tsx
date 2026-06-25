import { Colors } from "@/constants/common";
import images from "@/constants/images";
import { Participants } from "@/interfaces";
import { LeankerRowSkeletonList } from "@/components/SkeletonLoaders";
import { useChatSettings } from "@/lib/features/messages/useChatSettings";
import { formatDate } from "@/lib/utils";
import { Entypo, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { LegendList } from "@legendapp/list";
import { router } from "expo-router";
import { cssInterop } from "nativewind";
import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Interop the Image component to recognize the 'className' prop
cssInterop(Image, {
  className: { target: "style" },
});

export default function Settings() {
  const {
    activeLeank,
    chatId,
    currentUserId,
    handleEndReached,
    handleClose,
    handleLeave,
    handleRemove,
    handleRefresh,
    isFetchNextPageError,
    isFetchingNextPage,
    isInitialParticipantsError,
    isLeankLoading,
    isParticipantsLoading,
    leankerCount,
    leankers,
    openLeankerPreview,
    refreshStartedEmpty,
    refreshing,
    retryInitialParticipants,
    retryNextParticipantsPage,
  } = useChatSettings();

  const memoizedCover = useMemo(
    () => (
      <Image
        source={activeLeank?.cover ? { uri: activeLeank.cover } : images.leankCover}
        className="aspect-square rounded-b-3xl"
        contentFit="cover"
      />
    ),
    [activeLeank],
  );

  const renderLeankerRow = useCallback(
    (item: Participants, isHost = false) => (
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-5">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              openLeankerPreview({
                id: item.user.id,
                name: item.user.name,
                age: item.user.age,
                avatar: item.user.avatar,
              })
            }
          >
            <Image
              source={
                item.user.avatar
                  ? { uri: item.user.avatar }
                  : images.avatarPlaceholder
              }
              className="size-14 rounded-full"
              contentFit="cover"
            />
          </TouchableOpacity>
          <Text className="font-plus-jakarta-semibold">
            {item.user.id === currentUserId ? "You" : item.user.name}
          </Text>
        </View>
        {isHost ? (
          <Text className="font-plus-jakarta-regular text-gray-400">Host</Text>
        ) : (
          currentUserId === activeLeank?.owner?.id && (
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => handleRemove(item)}
            >
              <Text className="font-plus-jakarta-regular text-red-600">
                Remove
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>
    ),
    [
      activeLeank?.owner?.id,
      currentUserId,
      handleRemove,
      openLeankerPreview,
    ],
  );

  const renderItem = useCallback(
    ({ item }: { item: Participants }) => (
      <View className="mb-5 px-5">{renderLeankerRow(item)}</View>
    ),
    [renderLeankerRow],
  );

  const listEmptyComponent = useMemo(() => {
    if (
      (isParticipantsLoading && leankers.length === 0) ||
      (refreshing && refreshStartedEmpty)
    ) {
      return (
        <View className="px-5 pt-5">
          <LeankerRowSkeletonList count={3} />
        </View>
      );
    }

    if (isInitialParticipantsError) {
      return (
        <View className="items-center justify-center gap-3 px-5 py-8">
          <Text className="font-plus-jakarta-bold text-lg text-gray-700">
            Couldn&apos;t load leankers
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={retryInitialParticipants}
            className="rounded-full bg-gray-100 px-5 py-3"
          >
            <Text className="font-plus-jakarta-semibold text-gray-700">
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  }, [
    isInitialParticipantsError,
    isParticipantsLoading,
    leankers.length,
    refreshStartedEmpty,
    refreshing,
    retryInitialParticipants,
  ]);

  const paginationFooter = useMemo(() => {
    if (isFetchingNextPage) {
      return <LeankerRowSkeletonList count={2} />;
    }

    if (isFetchNextPageError) {
      return (
        <View className="items-center justify-center py-2">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={retryNextParticipantsPage}
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
  }, [
    isFetchNextPageError,
    isFetchingNextPage,
    retryNextParticipantsPage,
  ]);

  const listHeaderComponent = useMemo(
    () => (
      <View>
        <View>
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.9)"]}
            style={styles.overlay}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
          <View className="absolute h-full z-50 p-5 justify-between">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mt-10 flex size-11 flex-row items-center justify-center rounded-full bg-white shadow-sm shadow-slate-200"
            >
              <Ionicons name="arrow-back" size={20} />
            </TouchableOpacity>
            <View className="gap-2">
              <Text className="font-plus-jakarta-bold text-3xl color-white">
                {activeLeank?.title}
              </Text>
              {activeLeank?.description && (
                <Text className="font-plus-jakarta-semibold color-gray-200">
                  {activeLeank.description}
                </Text>
              )}
            </View>
          </View>

          {memoizedCover}
        </View>

        <View className="flex-row flex-wrap gap-x-5 gap-y-2 px-5 pt-5">
          <View className="flex-row items-center gap-3">
            <View className="flex size-10 flex-row items-center justify-center rounded-full bg-secondary-100">
              <Ionicons
                name="calendar-clear"
                size={16}
                color={Colors.secondary}
              />
            </View>
            <Text className="font-plus-jakarta-bold flex-shrink">
              {activeLeank ? formatDate(activeLeank.date) : "--"}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <View className="flex size-10 flex-row items-center justify-center rounded-full bg-secondary-100">
              <MaterialCommunityIcons
                name="clock-time-three"
                size={16}
                color={Colors.secondary}
              />
            </View>
            <Text className="font-plus-jakarta-bold flex-shrink">
              {activeLeank?.time || "--"}
            </Text>
          </View>

          <View className="flex-row items-center gap-3">
            <View className="flex size-10 flex-row items-center justify-center rounded-full bg-secondary-100">
              <Entypo name="location" size={16} color={Colors.secondary} />
            </View>
            <Text className="font-plus-jakarta-bold flex-shrink">
              {activeLeank?.location}
            </Text>
          </View>
        </View>

        <View className="gap-3 px-5 py-5">
          <Text className="font-plus-jakarta-semibold color-gray-400">
            {leankerCount} leankers
          </Text>

          {activeLeank?.owner &&
            renderLeankerRow(
              { id: `host-${activeLeank.owner.id}`, user: activeLeank.owner },
              true,
            )}
        </View>
      </View>
    ),
    [activeLeank, leankerCount, memoizedCover, renderLeankerRow],
  );

  const listFooterComponent = useMemo(
    () => (
      <View className="gap-10 px-5 pb-10 pt-5">
        {paginationFooter}
        <TouchableOpacity
          onPress={
            currentUserId === activeLeank?.owner?.id ? handleClose : handleLeave
          }
          className="rounded-2xl bg-red-600 p-4 shadow-sm"
          activeOpacity={0.6}
        >
          <View className="flex-row items-center justify-center">
            <Ionicons name="log-out-outline" size={20} color="white" />
            <Text className="ml-2 text-lg font-plus-jakarta-semibold text-white">
              {currentUserId === activeLeank?.owner?.id ? "Close" : "Leave"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    ),
    [
      activeLeank?.owner?.id,
      currentUserId,
      handleClose,
      handleLeave,
      paginationFooter,
    ],
  );

  if (!chatId) {
    return <Text>We could not find this chat room</Text>;
  }

  if (!activeLeank && isLeankLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <LegendList<Participants>
        data={leankers}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        estimatedItemSize={72}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeaderComponent}
        ListEmptyComponent={listEmptyComponent}
        ListFooterComponent={listFooterComponent}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    </View>
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
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
});
