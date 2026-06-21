import { appwriteConfig, client } from "@/appwrite/config";
import { LeankStatus, NavbarOptions } from "@/constants/enums";
import { Leank, LeankRequest, UserChatMeta } from "@/interfaces";
import { useGlobalContext } from "@/lib/GlobalContext";
import { usePremium } from "@/lib/PremiumContext";
import { FreeLimits } from "@/lib/featureGates";
import { apiClient } from "@/lib/api/client";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const getParticipantIds = (value: any): string[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.values)) return value.values;
  return [];
};

const hasMutationEvent = (events: string[] = []) =>
  events.some((event) =>
    ["create", "update", "delete"].some(
      (action) => event.endsWith(action) || event.includes(`.${action}`)
    )
  );

export function useMessagesTab() {
  const params = useLocalSearchParams<{ nav?: string }>();
  const { unreadCount, setUnreadCount, currentUser, showLoader, hideLoader } =
    useGlobalContext();
  const { isPro } = usePremium();
  const currentUserId = currentUser?.$id;
  const [refreshing, setRefreshing] = useState(false);
  const [chatRooms, setChatRooms] = useState<Leank[]>([]);
  const [chatMetas, setChatMetas] = useState<UserChatMeta[]>([]);
  const [requests, setRequests] = useState<LeankRequest[]>([]);
  const refreshTimersRef = useRef<{
    chats?: ReturnType<typeof setTimeout>;
    requests?: ReturnType<typeof setTimeout>;
    unread?: ReturnType<typeof setTimeout>;
  }>({});
  const chatIdsRef = useRef(new Set<string>());

  const isChats = params.nav === NavbarOptions.CHATS;

  useEffect(() => {
    chatIdsRef.current = new Set(chatRooms.map((chat) => chat.$id));
  }, [chatRooms]);

  const loadUnreadCount = useCallback(async () => {
    if (!currentUserId) return;
    const response = await apiClient.getUnreadCount();
    setUnreadCount(response.unreadCount);
  }, [currentUserId, setUnreadCount]);

  const loadChats = useCallback(async () => {
    if (!currentUserId) return;
    const response = await apiClient.getChats();
    setChatRooms(response.chats);
    setChatMetas(response.metas);
    setUnreadCount(response.unreadCount);
  }, [currentUserId, setUnreadCount]);

  const loadRequests = useCallback(async () => {
    if (!currentUserId) return;
    const response = await apiClient.getRequests();
    setRequests(response.requests);
  }, [currentUserId]);

  const refreshChat = useCallback(
    async (chatId: string) => {
      if (!currentUserId || !chatId) return;
      try {
        const { chat } = await apiClient.getChat(chatId);
        const participantIds = getParticipantIds(chat.participantIds);
        const canSeeChat =
          chat.status === LeankStatus.ACTIVE &&
          (chat.ownerId === currentUserId ||
            participantIds.includes(currentUserId));

        setChatRooms((prev) => {
          if (!canSeeChat) return prev.filter((item) => item.$id !== chatId);
          const index = prev.findIndex((item) => item.$id === chatId);
          if (index === -1) return [chat, ...prev];
          const next = [...prev];
          next[index] = { ...prev[index], ...chat };
          return next;
        });
      } catch {
        setChatRooms((prev) => prev.filter((item) => item.$id !== chatId));
      } finally {
        await loadUnreadCount().catch(() => {});
      }
    },
    [currentUserId, loadUnreadCount]
  );

  const schedule = useCallback(
    (kind: "chats" | "requests" | "unread", callback: () => Promise<void>) => {
      const timers = refreshTimersRef.current;
      if (timers[kind]) clearTimeout(timers[kind]);
      // Realtime can deliver related row updates back-to-back; coalesce them to avoid flicker.
      timers[kind] = setTimeout(() => {
        void callback().catch(() => {});
      }, 300);
    },
    []
  );

  const handleAcceptRequest = useCallback(
    async (request: LeankRequest) => {
      showLoader();
      try {
        const response = await apiClient.acceptRequest(request.$id);
        setRequests(response.requests);
        await loadChats();
      } finally {
        hideLoader();
      }
    },
    [hideLoader, loadChats, showLoader]
  );

  const handleDeclineRequest = useCallback(
    async (request: LeankRequest) => {
      showLoader();
      try {
        const response = await apiClient.declineRequest(request.$id);
        setRequests(response.requests);
      } finally {
        hideLoader();
      }
    },
    [hideLoader, showLoader]
  );

  const handleChatPress = useCallback(
    (chat: Leank) => {
      setChatMetas((prev) => {
        const index = prev.findIndex(
          (meta) => meta.leankId === chat.$id && meta.userId === currentUserId
        );
        if (index === -1) return prev;
        const next = [...prev];
        next[index] = { ...next[index], readAt: new Date() };
        return next;
      });

      router.push({
        pathname: "/messages/[chat]",
        params: { chat: chat.$id },
      });
    },
    [currentUserId]
  );

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      if (isChats) {
        await loadChats();
      } else {
        await loadRequests();
      }
    } finally {
      setRefreshing(false);
    }
  }, [isChats, loadChats, loadRequests]);

  useFocusEffect(
    useCallback(() => {
      void loadChats().catch(() => {});
      void loadRequests().catch(() => {});
    }, [loadChats, loadRequests])
  );

  useEffect(() => {
    if (!currentUserId) return;

    const requestChannel = `databases.${appwriteConfig.db}.tables.${appwriteConfig.tables.reactions}.rows`;
    const chatChannel = `databases.${appwriteConfig.db}.tables.${appwriteConfig.tables.leanks}.rows`;
    const messageChannel = `databases.${appwriteConfig.db}.tables.${appwriteConfig.tables.messages}.rows`;
    const chatMetaChannel = `databases.${appwriteConfig.db}.tables.${appwriteConfig.tables.userChatMeta}.rows`;

    const unsubscribeRequests = client.subscribe(requestChannel, (event) => {
      if (!hasMutationEvent(event.events)) return;
      const payload: any = event.payload;
      const ownerId = payload?.leank?.ownerId || payload?.ownerId;
      if (!ownerId || ownerId === currentUserId) {
        schedule("requests", loadRequests);
      }
    });

    const unsubscribeChats = client.subscribe(chatChannel, (event) => {
      if (!hasMutationEvent(event.events)) return;
      const payload: any = event.payload;
      if (payload?.$id) {
        void refreshChat(payload.$id);
        return;
      }
      schedule("chats", loadChats);
    });

    const unsubscribeMessages = client.subscribe(messageChannel, (event) => {
      if (!hasMutationEvent(event.events)) return;
      const payload: any = event.payload;
      const chatId = payload?.leankId;
      // Message events are global; filter first so unrelated chats do not trigger Appwrite reads.
      if (chatId && chatIdsRef.current.has(chatId)) {
        void refreshChat(chatId);
      }
    });

    const unsubscribeChatMeta = client.subscribe(chatMetaChannel, (event) => {
      if (!hasMutationEvent(event.events)) return;
      const payload: any = event.payload;
      if (payload?.userId !== currentUserId) return;

      setChatMetas((prev) => {
        const index = prev.findIndex(
          (meta) =>
            meta.$id === payload.$id ||
            (meta.leankId === payload.leankId &&
              meta.userId === currentUserId)
        );
        if (index === -1) return [payload as UserChatMeta, ...prev];
        const next = [...prev];
        next[index] = { ...next[index], ...(payload as UserChatMeta) };
        return next;
      });
      schedule("unread", loadUnreadCount);
    });

    return () => {
      unsubscribeRequests();
      unsubscribeChats();
      unsubscribeMessages();
      unsubscribeChatMeta();
      Object.values(refreshTimersRef.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [
    currentUserId,
    loadChats,
    loadRequests,
    loadUnreadCount,
    refreshChat,
    schedule,
  ]);

  const visibleRequests = useMemo(() => {
    if (isPro) return requests;
    return requests.slice(0, FreeLimits.REQUESTS_VISIBLE);
  }, [isPro, requests]);

  const shouldShowRequestsPaywall = useMemo(
    () => !isChats && !isPro && requests.length > FreeLimits.REQUESTS_VISIBLE,
    [isChats, isPro, requests.length]
  );

  return {
    chatMetas,
    chatRooms,
    currentUserId,
    handleAcceptRequest,
    handleChatPress,
    handleDeclineRequest,
    handleRefresh,
    isChats,
    refreshing,
    requests,
    shouldShowRequestsPaywall,
    unreadCount,
    visibleRequests,
  };
}
