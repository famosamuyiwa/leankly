import { NavbarOptions } from "@/constants/enums";
import { Leank, LeankRequest, UserChatMeta } from "@/interfaces";
import { useGlobalContext } from "@/lib/GlobalContext";
import { usePremium } from "@/lib/PremiumContext";
import { apiClient } from "@/lib/api/client";
import { realtime } from "@/lib/api/realtime";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useMessagesTab() {
  const params = useLocalSearchParams<{ nav?: string }>();
  const {
    unreadChatCount,
    pendingRequestCount,
    setUnreadCount,
    setPendingRequestCount,
    currentUser,
    showLoader,
    hideLoader,
  } = useGlobalContext();
  const { isPro } = usePremium();
  const currentUserId = currentUser?.id;
  const [refreshing, setRefreshing] = useState(false);
  const [chatRooms, setChatRooms] = useState<Leank[]>([]);
  const [chatMetas, setChatMetas] = useState<UserChatMeta[]>([]);
  const [requests, setRequests] = useState<LeankRequest[]>([]);
  const [requestsLocked, setRequestsLocked] = useState(false);
  const refreshTimersRef = useRef<{
    chats?: ReturnType<typeof setTimeout>;
    requests?: ReturnType<typeof setTimeout>;
  }>({});
  const chatIdsRef = useRef(new Set<string>());

  const nav =
    params.nav === NavbarOptions.CHATS || params.nav === NavbarOptions.REQUESTS
      ? params.nav
      : NavbarOptions.REQUESTS;
  const isChats = nav === NavbarOptions.CHATS;

  const handleNavChange = useCallback(
    (nextNav: NavbarOptions) => {
      if (nextNav === nav) return;
      router.setParams({ nav: nextNav });
    },
    [nav],
  );

  useEffect(() => {
    chatIdsRef.current = new Set(chatRooms.map((chat) => chat.id));
  }, [chatRooms]);

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
    setRequestsLocked(Boolean(response.isLocked));
    setPendingRequestCount(response.totalPending || 0);
  }, [currentUserId, setPendingRequestCount]);

  const schedule = useCallback(
    (kind: "chats" | "requests", callback: () => Promise<void>) => {
      const timers = refreshTimersRef.current;
      if (timers[kind]) clearTimeout(timers[kind]);
      // Realtime can deliver related row updates back-to-back; coalesce them to avoid flicker.
      timers[kind] = setTimeout(() => {
        void callback().catch(() => {});
      }, 300);
    },
    [],
  );

  const handleAcceptRequest = useCallback(
    async (request: LeankRequest) => {
      showLoader();
      try {
        const response = await apiClient.acceptRequest(request.id);
        setRequests(response.requests);
        setRequestsLocked(Boolean(response.isLocked));
        setPendingRequestCount(response.totalPending || 0);
        await loadChats();
      } finally {
        hideLoader();
      }
    },
    [hideLoader, loadChats, setPendingRequestCount, showLoader],
  );

  const handleDeclineRequest = useCallback(
    async (request: LeankRequest) => {
      showLoader();
      try {
        const response = await apiClient.declineRequest(request.id);
        setRequests(response.requests);
        setRequestsLocked(Boolean(response.isLocked));
        setPendingRequestCount(response.totalPending || 0);
      } finally {
        hideLoader();
      }
    },
    [hideLoader, setPendingRequestCount, showLoader],
  );

  const handleChatPress = useCallback(
    (chat: Leank) => {
      setChatMetas((prev) => {
        const index = prev.findIndex(
          (meta) => meta.leankId === chat.id && meta.userId === currentUserId,
        );
        if (index === -1) return prev;
        const next = [...prev];
        next[index] = { ...next[index], readAt: new Date().toISOString() };
        return next;
      });

      router.push({
        pathname: "/messages/[chat]",
        params: { chat: chat.id },
      });
    },
    [currentUserId],
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
    }, [loadChats, loadRequests]),
  );

  useEffect(() => {
    if (!currentUserId) return;
    const unsubscribers = [
      realtime.subscribe("connect", () => schedule("chats", loadChats)),
      realtime.subscribe("reaction.updated", () =>
        schedule("requests", loadRequests),
      ),
      realtime.subscribe("attention.changed", () =>
        schedule("requests", loadRequests),
      ),
      realtime.subscribe("leank.updated", (payload) => {
        const chatId = payload?.leankId || payload?.id;
        if (!chatId || chatIdsRef.current.has(chatId)) {
          schedule("chats", loadChats);
        }
      }),
      realtime.subscribe("message.created", (payload) => {
        const chatId = payload?.leankId;
        if (chatId && chatIdsRef.current.has(chatId)) {
          schedule("chats", loadChats);
        }
      }),
      realtime.subscribe("chatMeta.updated", () =>
        schedule("chats", loadChats),
      ),
      realtime.subscribe("unread.changed", () =>
        schedule("chats", loadChats),
      ),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      Object.values(refreshTimersRef.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [currentUserId, loadChats, loadRequests, schedule]);

  useEffect(() => {
    const unsubscribers = chatRooms.map((chat) =>
      realtime.subscribeLeank(chat.id),
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [chatRooms]);

  const visibleRequests = useMemo(() => {
    return requests;
  }, [requests]);

  const shouldShowRequestsPaywall = useMemo(
    () => !isChats && !isPro && requestsLocked,
    [isChats, isPro, requestsLocked],
  );

  return {
    chatMetas,
    chatRooms,
    currentUserId,
    handleAcceptRequest,
    handleChatPress,
    handleNavChange,
    handleDeclineRequest,
    handleRefresh,
    isChats,
    nav,
    refreshing,
    requests,
    shouldShowRequestsPaywall,
    pendingRequestCount,
    unreadChatCount,
    visibleRequests,
  };
}
