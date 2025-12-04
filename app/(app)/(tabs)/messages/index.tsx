import { updateArrayRow } from "@/appwrite/actions/leank.actions";
import { appwriteConfig, client, db, sendPushNotification } from "@/appwrite/config";
import {
  ChatCard,
  LockedRequestPlaceholder,
  RequestCard,
} from "@/components/Cards";
import NavBar from "@/components/NavBar";
import { emptyScreenImages } from "@/constants/data";
import {
  LeankStatus,
  NavbarOptions,
  PushNotificationTypes,
  RequestAction,
  Screens,
} from "@/constants/enums";
import { Leank, LeankRequest, PNAlert, User, UserChatMeta } from "@/interfaces";
import { useGlobalContext } from "@/lib/GlobalContext";
import { usePremium } from "@/lib/PremiumContext";
import { FreeLimits } from "@/lib/featureGates";
import { LegendList } from "@legendapp/list";
import { Image } from "expo-image";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { ID, Query } from "react-native-appwrite";
import { RefreshControl } from "react-native-gesture-handler";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";

export default function MessagesScreen() {
  const params = useLocalSearchParams<{
    nav?: string;
  }>();

  const { unreadCount, setUnreadCount, currentUser, blockedUserIds } = useGlobalContext();
  const { isPro, openPaywall } = usePremium();
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [chatRooms, setChatRooms] = useState<Leank[]>([]);
  const [chatMetas, setChatMetas] = useState<UserChatMeta[]>([]);
  const [requests, setRequests] = useState<LeankRequest[]>([]);
  const { showLoader, hideLoader } = useGlobalContext();

  const isChats = params.nav === NavbarOptions.CHATS;

  const handleOnAcceptPress = async (
    reqId: string,
    leank: Leank,
    user: User
  ) => {
    showLoader();
    try {
      await updateArrayRow({
        tableId: appwriteConfig.tables.leanks,
        rowId: leank.$id,
        field: "participantIds",
        values: [user.$id],
        action: "add",
      });

      await db.createRow({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.participants,
        rowId: ID.unique(),
        data: {
          leank: leank.$id,
          user: user.$id,
        },
      });

      await db.updateRow({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.reactions,
        rowId: reqId,
        data: {
          status: RequestAction.ACCEPTED,
          $updatedAt: new Date().toISOString(),
        },
      });

      const pn = {
        token: user.pushToken,
        title: "Leank request accepted",
        content: `${leank.title}`,
      };

      // alert participant
      sendPushNotification({
        type: PushNotificationTypes.ALERT,
        data: pn as PNAlert,
      });
      setRequests((prev) => prev.filter((r) => r.$id !== reqId));
    } catch (e) {
      console.log(e);
    } finally {
      hideLoader();
    }
  };

  const handleOnDeclinePress = async (reqId: string, leank: Leank) => {
    showLoader();
    try {
      await db.updateRow({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.reactions,
        rowId: reqId,
        data: {
          status: RequestAction.DECLINED,
          $updatedAt: new Date().toISOString(),
        },
      });

      setRequests((prev) => prev.filter((r) => r.$id !== reqId));
    } catch (e) {
      console.log(e);
    } finally {
      hideLoader();
    }
  };

  const fetchRequests = useCallback(async () => {
    if (!currentUser) return;

    const queries: any[] = [
      Query.select([
        "isLiked",
        "userId",
        "leankId",
        "user.name",
        "user.age",
        "user.avatar",
        "user.pushToken",
        "leank.title",
        "leank.ownerId",
      ]),
      Query.equal("leank.ownerId", currentUser.$id),
      Query.equal("isLiked", true),
      Query.equal("status", RequestAction.PENDING),
      Query.orderDesc("$createdAt"),
    ];

    try {
      const { rows, total } = await db.listRows({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.reactions,
        queries,
      });

      setRequests(rows as unknown as LeankRequest[]);
    } catch (e) {
      console.log(e);
    }
  }, [currentUser?.$id]);

  const fetchChatRooms = useCallback(async () => {
    if (!currentUser) return;
    try {
      const { rows, total } = await db.listRows({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.leanks,
        queries: [
          Query.select([
            "cover",
            "title",
            "lastMessage.senderName",
            "lastMessage.content",
            "lastMessage.senderId",
            "lastMessage.$createdAt",
            "ownerId",
            "participantIds",
            "status",
          ]),
          Query.or([
            Query.equal("ownerId", currentUser.$id),
            Query.contains("participantIds", currentUser.$id),
          ]),
          Query.equal("status", LeankStatus.ACTIVE),
        ],
      });
      const cleaned = (rows as unknown as Leank[]).filter(
        (r) => !blockedUserIds.includes(r.ownerId)
      );
      setChatRooms(cleaned);
    } catch (e) {
      console.log(e);
    }
  }, [currentUser?.$id]);

  const fetchChatMeta = useCallback(async () => {
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
  }, [currentUser?.$id]);

  const getChatDetails = useCallback(async () => {
    await Promise.all([fetchChatRooms(), fetchChatMeta()]);
  }, [fetchChatRooms, fetchChatMeta]);

  useFocusEffect(
    useCallback(() => {
      getChatDetails();
      fetchRequests();
    }, [fetchRequests, getChatDetails])
  );

  useEffect(() => {
    if (!currentUser?.$id) return;
    const currentUserId = currentUser.$id as string;

    const hasMutationEvent = (events: string[] = []) =>
      events.some((event) =>
        ["create", "update", "delete"].some((action) =>
          event.endsWith(action) || event.includes(`.${action}`)
        )
      );

    const requestChannel = `databases.${appwriteConfig.db}.tables.${appwriteConfig.tables.reactions}.rows`;
    const chatChannel = `databases.${appwriteConfig.db}.tables.${appwriteConfig.tables.leanks}.rows`;
    const chatMetaChannel = `databases.${appwriteConfig.db}.tables.${appwriteConfig.tables.userChatMeta}.rows`;

    const unsubscribeRequests = client.subscribe(requestChannel, (event) => {
      if (!hasMutationEvent(event.events)) return;
      const payload: any = event.payload;
      const leankOwnerId =
        payload?.leank?.ownerId ||
        payload?.leank?.owner?.$id ||
        payload?.ownerId;
      if (leankOwnerId === currentUserId) {
        fetchRequests();
      }
    });

    const unsubscribeChats = client.subscribe(chatChannel, (event) => {
      if (!hasMutationEvent(event.events)) return;
      const payload: any = event.payload;
      const participantIds: string[] = Array.isArray(payload?.participantIds)
        ? payload.participantIds
        : payload?.participantIds?.values || [];
      const isRelevant =
        payload?.ownerId === currentUserId ||
        participantIds.includes(currentUserId);
      if (isRelevant) {
        getChatDetails();
      }
    });

    const unsubscribeChatMeta = client.subscribe(
      chatMetaChannel,
      (event) => {
        if (!hasMutationEvent(event.events)) return;
        const payload: any = event.payload;
        if (payload?.userId === currentUserId) {
          fetchChatMeta();
        }
      }
    );

    return () => {
      unsubscribeRequests();
      unsubscribeChats();
      unsubscribeChatMeta();
    };
  }, [
    currentUser?.$id,
    fetchRequests,
    getChatDetails,
    fetchChatMeta,
  ]);

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
    <View className="mb-5">
      <RequestCard
        item={item}
        onDeclinePress={() => handleOnDeclinePress(item.$id, item.leank)}
        onAcceptPress={() =>
          handleOnAcceptPress(item.$id, item.leank, item.user)
        }
      />
    </View>
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
            if (!Array.isArray(prev) || prev.length === 0 || !update?.$id)
              return prev ?? [];

            const index = prev.findIndex((r) => r && r.$id === update.$id);
            if (index === -1) return prev;

            const newRooms = [...prev];
            newRooms[index] = { ...(prev[index] || {}), ...update };
            return newRooms;
          });

          setChatMetas((prev) => {
            if (!Array.isArray(prev) || prev.length === 0 || !metaUpdate?.$id)
              return prev ?? [];

            const index = prev.findIndex((r) => r && r.$id === metaUpdate.$id);
            if (index === -1) return prev;

            const newMetas = [...prev];
            newMetas[index] = { ...(prev[index] || {}), ...metaUpdate };
            return newMetas;
          });
        }}
        onPress={() => {
          setChatMetas((prev) => {
            if (!Array.isArray(prev) || prev.length === 0) return prev ?? [];

            const index = prev.findIndex(
              (meta) =>
                meta &&
                meta.leankId === item?.$id &&
                meta.userId === currentUser?.$id
            );
            if (index === -1) return prev;

            const newMetas = [...prev];
            newMetas[index] = { ...(prev[index] || {}), readAt: new Date() };
            return newMetas;
          });

          router.push({
            pathname: "/messages/[chat]",
            params: { chat: item?.$id ?? "" },
          });
        }}
      />
    </View>
  );

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      if (isChats) {
        await getChatDetails();
      } else {
        await fetchRequests();
      }
    } catch (e) {
      console.log(e);
    } finally {
      setRefreshing(false);
    }
  };

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
          You don't have any {isChats ? "chats" : "requests"} at the moment.
          Check back later!
        </Text>
      </View>
    );
  }, [isChats]);

  const requestsFooter = useMemo(() => {
    if (isChats) return null;
    if (isPro) return null;
    if (!requests || requests.length <= FreeLimits.REQUESTS_VISIBLE)
      return null;
    return (
      <View className="py-6">
        <LockedRequestPlaceholder />
      </View>
    );
  }, [isChats, isPro, requests]);

  const visibleRequests = useMemo(() => {
    if (isPro) return requests;
    return requests.slice(0, FreeLimits.REQUESTS_VISIBLE);
  }, [isPro, requests]);

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
          data={visibleRequests}
          renderItem={memoizedRequestCard}
          keyExtractor={(i) => i.$id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={listEmptyComponent}
          ListFooterComponent={requestsFooter as any}
        />
      )}
    </Animated.View>
  );
}
