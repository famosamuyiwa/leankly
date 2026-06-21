import {
  ChatCard,
  LockedRequestPlaceholder,
  RequestCard,
} from "@/components/Cards";
import NavBar from "@/components/NavBar";
import { emptyScreenImages } from "@/constants/data";
import { NavbarOptions, Screens } from "@/constants/enums";
import { Leank, LeankRequest } from "@/interfaces";
import { useMessagesTab } from "@/lib/features/messages/useMessagesTab";
import { LegendList } from "@legendapp/list";
import { Image } from "expo-image";
import { useMemo } from "react";
import { Text, View } from "react-native";
import { RefreshControl } from "react-native-gesture-handler";

export default function MessagesScreen() {
  const {
    chatMetas,
    chatRooms,
    currentUserId,
    handleAcceptRequest,
    handleChatPress,
    handleDeclineRequest,
    handleRefresh,
    isChats,
    refreshing,
    shouldShowRequestsPaywall,
    unreadCount,
    visibleRequests,
  } = useMessagesTab();

  const listEmptyComponent = useMemo(() => {
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
  }, [isChats]);

  const requestsFooter = useMemo(() => {
    if (!shouldShowRequestsPaywall) return null;
    return (
      <View className="py-6">
        <LockedRequestPlaceholder />
      </View>
    );
  }, [shouldShowRequestsPaywall]);

  return (
    <View className="flex-1 bg-white px-5">
      <View className="py-5">
        <NavBar
          screen={Screens.CHAT}
          badgeCounts={{ [NavbarOptions.CHATS]: unreadCount }}
        />
      </View>
      {isChats ? (
        <LegendList<Leank>
          data={chatRooms}
          renderItem={({ item }) => (
            <View className="mb-5">
              <ChatCard
                item={item}
                meta={chatMetas.find(
                  (meta) =>
                    meta.leankId === item.$id && meta.userId === currentUserId
                )}
                userId={currentUserId}
                onPress={() => handleChatPress(item)}
              />
            </View>
          )}
          keyExtractor={(i) => i.$id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={listEmptyComponent}
          extraData={chatMetas}
        />
      ) : (
        <LegendList<LeankRequest>
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
          keyExtractor={(i) => i.$id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={listEmptyComponent}
          ListFooterComponent={requestsFooter as any}
        />
      )}
    </View>
  );
}
