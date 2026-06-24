import {
  ChatCard,
  LockedRequestPlaceholder,
  RequestCard,
} from "@/components/Cards";
import NavBar from "@/components/NavBar";
import {
  ChatCardSkeletonList,
  RequestCardSkeletonList,
} from "@/components/SkeletonLoaders";
import { emptyScreenImages } from "@/constants/data";
import { NavbarOptions, Screens } from "@/constants/enums";
import { Leank, LeankRequest } from "@/interfaces";
import { useMessagesTab } from "@/lib/features/messages/useMessagesTab";
import { LegendList } from "@legendapp/list";
import { Image } from "expo-image";
import { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { RefreshControl } from "react-native-gesture-handler";

export default function MessagesScreen() {
  const {
    chatMetas,
    chatRooms,
    currentUserId,
    handleAcceptRequest,
    handleChatPress,
    handleDeclineRequest,
    handleEndReached,
    handleNavChange,
    handleRefresh,
    isChats,
    isFetchNextPageError,
    isFetchingNextPage,
    isInitialError,
    isInitialLoading,
    nav,
    pendingRequestCount,
    refreshStartedEmpty,
    refreshing,
    retryInitialPage,
    retryNextPage,
    shouldShowRequestsPaywall,
    unreadChatCount,
    visibleRequests,
  } = useMessagesTab();

  const listEmptyComponent = useMemo(() => {
    const activeListLength = isChats ? chatRooms.length : visibleRequests.length;
    const shouldShowSkeleton =
      (isInitialLoading && activeListLength === 0) ||
      (refreshing && refreshStartedEmpty);

    if (shouldShowSkeleton) {
      return (
        <View className="pt-1">
          {isChats ? (
            <ChatCardSkeletonList count={4} />
          ) : (
            <RequestCardSkeletonList count={2} />
          )}
        </View>
      );
    }

    if (isInitialError) {
      return (
        <View className="h-3/4 items-center justify-center gap-3">
          <Text className="font-plus-jakarta-bold text-lg text-gray-700">
            Couldn&apos;t load {isChats ? "chats" : "requests"}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={retryInitialPage}
            className="rounded-full bg-gray-100 px-5 py-3"
          >
            <Text className="font-plus-jakarta-semibold text-gray-700">
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View className="mt-10 px-10 justify-center items-center gap-5">
        <Image
          source={{ uri: emptyScreenImages[isChats ? "Chats" : "Requests"] }}
          className="h-60 w-full rounded-t-3xl border-1"
          contentFit="contain"
        />
        <Text className="font-plus-jakarta-extrabold text-gray-400 text-3xl ">
          No {isChats ? "Chats" : "Requests"}
        </Text>
        <Text className="text-center  text-gray-400 ">
          You don&apos;t have any {isChats ? "chats" : "requests"} at the
          moment. Check back later!
        </Text>
      </View>
    );
  }, [
    chatRooms.length,
    isChats,
    isInitialError,
    isInitialLoading,
    refreshStartedEmpty,
    refreshing,
    retryInitialPage,
    visibleRequests.length,
  ]);

  const paginationFooter = useMemo(() => {
    if (isFetchingNextPage) {
      return (
        <View className="pt-2">
          {isChats ? (
            <ChatCardSkeletonList count={2} />
          ) : (
            <RequestCardSkeletonList count={1} />
          )}
        </View>
      );
    }

    if (isFetchNextPageError) {
      return (
        <View className="items-center justify-center py-6">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={retryNextPage}
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
  }, [isChats, isFetchNextPageError, isFetchingNextPage, retryNextPage]);

  const requestsFooter = useMemo(() => {
    if (!shouldShowRequestsPaywall && !paginationFooter) return null;
    return (
      <View>
        {paginationFooter}
        {shouldShowRequestsPaywall && (
          <View className="py-6">
            <LockedRequestPlaceholder />
          </View>
        )}
      </View>
    );
  }, [paginationFooter, shouldShowRequestsPaywall]);

  return (
    <View className="flex-1 bg-white px-5">
      <View className="py-5">
        <NavBar
          screen={Screens.CHAT}
          value={nav}
          onChange={handleNavChange}
          badgeCounts={{
            [NavbarOptions.CHATS]: unreadChatCount,
            [NavbarOptions.REQUESTS]: pendingRequestCount,
          }}
        />
      </View>
      {isChats ? (
        <LegendList<Leank>
          key="messages-chats-list"
          data={chatRooms}
          renderItem={({ item }) => (
            <View className="mb-5">
              <ChatCard
                item={item}
                meta={chatMetas.find(
                  (meta) =>
                    meta.leankId === item.id && meta.userId === currentUserId,
                )}
                userId={currentUserId}
                onPress={() => handleChatPress(item)}
              />
            </View>
          )}
          keyExtractor={(i) => i.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={listEmptyComponent}
          ListFooterComponent={paginationFooter}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          maintainVisibleContentPosition={false}
          extraData={chatMetas}
        />
      ) : (
        <LegendList<LeankRequest>
          key="messages-requests-list"
          data={visibleRequests}
          renderItem={({ item }) => (
            <View className="mb-5">
              <RequestCard
                item={item}
                onDeclinePress={() => handleDeclineRequest(item)}
                onAcceptPress={() => handleAcceptRequest(item)}
              />
            </View>
          )}
          keyExtractor={(i) => i.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={listEmptyComponent}
          ListFooterComponent={requestsFooter as any}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          maintainVisibleContentPosition={false}
        />
      )}
    </View>
  );
}
