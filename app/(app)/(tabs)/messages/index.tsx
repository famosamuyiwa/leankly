import { ChatCard, RequestCard } from "@/components/Cards";
import NavBar from "@/components/NavBar";
import { appwriteConfig, db } from "@/config/appwrite";
import { dummyRequests } from "@/constants/data";
import { NavbarOptions, Screens } from "@/constants/enums";
import { Leank, LeankRequest } from "@/interfaces";
import { LegendList } from "@legendapp/list";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { Query } from "react-native-appwrite";
import { RefreshControl } from "react-native-gesture-handler";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";

export default function MessagesScreen() {
  const handleOnDeclinePress = () => {};
  const handleOnAcceptPress = () => {};

  const params = useLocalSearchParams<{
    nav?: string;
  }>();

  const [refreshing, setRefreshing] = useState(false);
  const [chatRooms, setChatRooms] = useState<Leank[]>([]);
  const isChats = params.nav === NavbarOptions.CHATS;

  const fetchChatRooms = async () => {
    try {
      const { rows, total } = await db.listRows({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.leanks,
        queries: [Query.limit(100)],
      });
      setChatRooms(rows as unknown as Leank[]);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    fetchChatRooms();
  }, []);

  const memoizedRequestCard = useCallback(
    ({ item }: { item: LeankRequest }) => (
      <RequestCard
        item={item}
        onDeclinePress={handleOnDeclinePress}
        onAcceptPress={handleOnAcceptPress}
      />
    ),
    []
  );

  const memoizedChatCard = useCallback(
    ({ item }: { item: Leank }) => (
      <View className="mb-5">
        <ChatCard
          item={item}
          onPress={() =>
            router.push({
              pathname: "/messages/[chat]",
              params: { chat: item.$id },
            })
          }
        />
      </View>
    ),
    [chatRooms]
  );

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchChatRooms();
    } catch (e) {
      console.log(e);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Animated.View
      layout={LinearTransition}
      entering={FadeIn.duration(500)}
      className="flex-1 bg-white px-5"
    >
      <View className="py-5">
        <NavBar screen={Screens.CHAT} />
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
