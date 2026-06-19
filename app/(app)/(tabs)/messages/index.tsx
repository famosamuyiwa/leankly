import { updateArrayRow } from "@/appwrite/actions/leank.actions";
import {
  appwriteConfig,
  client,
  db,
  sendPushNotification,
} from "@/appwrite/config";
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
import {
  Leank,
  LeankRequest,
  PNAlert,
  User,
  UserChatMeta,
} from "@/interfaces";
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

export default function MessagesScreen() {
  const params = useLocalSearchParams<{
    nav?: string;
  }>();

  const { unreadCount, setUnreadCount, currentUser, blockedUserIds } =
    useGlobalContext();
  const currentUserId = currentUser?.$id;
  const { isPro } = usePremium();
  const [refreshing, setRefreshing] = useState(false);
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

      // Accept can be retried after a partial failure; avoid duplicate participant rows.
      const { total: existingParticipantTotal } = await db.listRows({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.participants,
        queries: [
          Query.select(["$id"]),
          Query.equal("leank", leank.$id),
          Query.equal("user", user.$id),
          Query.limit(1),
        ],
      });

      if (existingParticipantTotal === 0) {
        await db.createRow({
          databaseId: appwriteConfig.db,
          tableId: appwriteConfig.tables.participants,
          rowId: ID.unique(),
          data: {
            leank: leank.$id,
            user: user.$id,
          },
        });
      }

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

      await sendPushNotification({
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
    if (!currentUserId) return;

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
      Query.equal("leank.ownerId", currentUserId),
      Query.equal("isLiked", true),
      Query.equal("status", RequestAction.PENDING),
      Query.orderDesc("$createdAt"),
    ];

    try {
      const { rows } = await db.listRows({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.reactions,
        queries,
      });

      setRequests(rows as unknown as LeankRequest[]);
    } catch (e) {
      console.log(e);
    }
  }, [currentUserId]);

  const fetchChatRooms = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const { rows } = await db.listRows({
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
            Query.equal("ownerId", currentUserId),
            Query.contains("participantIds", currentUserId),
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
  }, [blockedUserIds, currentUserId]);

  const fetchChatMeta = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const { rows } = await db.listRows({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.userChatMeta,
        queries: [Query.equal("userId", currentUserId)],
      });
      setChatMetas(rows as unknown as UserChatMeta[]);
    } catch (e) {
      console.log(e);
    }
  }, [currentUserId]);

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
    if (!currentUserId) return;

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
    currentUserId,
    fetchRequests,
    getChatDetails,
    fetchChatMeta,
  ]);

  useEffect(() => {
    const unread = chatRooms.filter((room) => {
      const meta = chatMetas.find(
        (m) => m.leankId === room.$id && m.userId === currentUserId
      );
      return (
        room.lastMessage &&
        new Date(room.lastMessage.$createdAt) > new Date(meta?.readAt || 0) &&
        room.lastMessage.senderId !== currentUserId
      );
    }).length;
    setUnreadCount(unread);
  }, [chatRooms, chatMetas, currentUserId, setUnreadCount]);

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
            meta.leankId === item.$id && meta.userId === currentUserId
        )}
        userId={currentUserId}
        onPress={() => {
          setChatMetas((prev) => {
            if (!Array.isArray(prev) || prev.length === 0) return prev ?? [];

            const index = prev.findIndex(
              (meta) =>
                meta &&
                meta.leankId === item?.$id &&
                meta.userId === currentUserId
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
          You don&apos;t have any {isChats ? "chats" : "requests"} at the moment.
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
    </View>
  );
}
