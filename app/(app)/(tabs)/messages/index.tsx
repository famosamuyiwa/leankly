import { appwriteConfig, db } from "@/appwrite/config";
import { ChatCard, RequestCard } from "@/components/Cards";
import NavBar from "@/components/NavBar";
import { dummyRequests } from "@/constants/data";
import { NavbarOptions, Screens } from "@/constants/enums";
import { Leank, LeankRequest, UserChatMeta } from "@/interfaces";
import { useGlobalContext } from "@/lib/GlobalContext";
import { LegendList } from "@legendapp/list";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Query } from "react-native-appwrite";
import { RefreshControl } from "react-native-gesture-handler";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";

export default function MessagesScreen() {
  const { unreadCount, setUnreadCount, currentUser } = useGlobalContext();

  const handleOnDeclinePress = () => {};
  const handleOnAcceptPress = () => {};

  const params = useLocalSearchParams<{
    nav?: string;
  }>();

  const [refreshing, setRefreshing] = useState(false);
  const [chatRooms, setChatRooms] = useState<Leank[]>([]);
  const [chatMetas, setChatMetas] = useState<UserChatMeta[]>([]);
  const isChats = params.nav === NavbarOptions.CHATS;

  const fetchChatRooms = async () => {
    if (!currentUser) return;
    try {
      const { rows, total } = await db.listRows({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.leanks,
        queries: [
          Query.limit(10),
          Query.select([
            "cover",
            "title",
            "lastMessage.senderName",
            "lastMessage.content",
            "lastMessage.senderId",
            "lastMessage.$createdAt",
            "ownerId",
            "participantIds",
          ]),
          Query.or([
            Query.equal("ownerId", currentUser.$id),
            Query.contains("participantIds", currentUser.$id),
          ]),
        ],
      });
      setChatRooms(rows as unknown as Leank[]);
    } catch (e) {
      console.log(e);
    }
  };

  const fetchChatMeta = async () => {
    if (!currentUser) return;
    try {
      const { rows, total } = await db.listRows({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.userChatMeta,
        queries: [Query.equal("userId", currentUser.$id)],
      });
      setChatMetas(rows as unknown as UserChatMeta[]);
    } catch (e) {
      console.log(e);
    }
  };

  const getChatDetails = async () => {
    fetchChatRooms();
    fetchChatMeta();
  };

  useEffect(() => {
    getChatDetails();
  }, []);

  useEffect(() => {
    const unread = chatRooms.filter((room) => {
      const meta = chatMetas.find(
        (m) => m.leankId === room.$id && m.userId === currentUser?.$id
      );
      return (
        room.lastMessage &&
        new Date(room.lastMessage.$createdAt) > new Date(meta?.readAt || 0) &&
        room.lastMessage.senderId !== currentUser?.$id
      );
    }).length;
    setUnreadCount(unread);
  }, [chatRooms, chatMetas]);

  const memoizedRequestCard = ({ item }: { item: LeankRequest }) => (
    <RequestCard
      item={item}
      onDeclinePress={handleOnDeclinePress}
      onAcceptPress={handleOnAcceptPress}
    />
  );

  const memoizedChatCard = ({ item }: { item: Leank }) => (
    <View className="mb-5">
      <ChatCard
        item={item}
        meta={chatMetas.find(
          (meta) =>
            meta.leankId === item.$id && meta.userId === currentUser?.$id
        )}
        userId={currentUser?.$id}
        onItemUpdate={(update, metaUpdate) => {
          setChatRooms((prev) => {
            const index = prev.findIndex((r) => r.$id === update.$id);
            if (index === -1) return prev; // not found

            const newRooms = [...prev];
            newRooms[index] = { ...prev[index], ...update };
            return newRooms;
          });
          setChatMetas((prev) => {
            const index = prev.findIndex((r) => r.$id === metaUpdate.$id);
            if (index === -1) return prev; // not found

            const newMetas = [...prev];
            newMetas[index] = { ...prev[index], ...metaUpdate };
            return newMetas;
          });
        }}
        onPress={() => {
          setChatMetas((prev) => {
            const index = prev.findIndex(
              (meta) =>
                meta.leankId === item.$id && meta.userId === currentUser?.$id
            );
            if (index === -1) return prev; // not found

            const newMetas = [...prev];
            newMetas[index] = { ...prev[index], readAt: new Date() };
            return newMetas;
          });
          router.push({
            pathname: "/messages/[chat]",
            params: { chat: item.$id },
          });
        }}
      />
    </View>
  );

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await getChatDetails();
    } catch (e) {
      console.log(e);
    } finally {
      setRefreshing(false);
    }
  };

  const listEmptyComponent = useMemo(() => {
    return (
      <View className="mt-10 px-10">
        <Text className="font-plus-jakarta-semibold color-gray-400 text-center">
          {isChats
            ? "No chats started yet. Post a leank or join one nearby!"
            : "Nothing to see here yet."}
        </Text>
      </View>
    );
  }, [isChats]);

  return (
    <Animated.View
      layout={LinearTransition}
      entering={FadeIn.duration(500)}
      className="flex-1 bg-white px-5"
    >
      <View className="py-5">
        <NavBar
          screen={Screens.CHAT}
          badgeCounts={{ [NavbarOptions.CHATS]: unreadCount }}
        />
      </View>
      {isChats ? (
        <LegendList<Leank>
          data={chatRooms}
          renderItem={memoizedChatCard}
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
          data={dummyRequests}
          renderItem={memoizedRequestCard}
          keyExtractor={(i) => i.$id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </Animated.View>
  );
}
