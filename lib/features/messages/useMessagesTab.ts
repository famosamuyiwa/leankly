import { NavbarOptions } from "@/constants/enums";
import { Leank, LeankRequest, UserChatMeta } from "@/interfaces";
import { useGlobalContext } from "@/lib/GlobalContext";
import { usePremium } from "@/lib/PremiumContext";
import { apiClient } from "@/lib/api/client";
import { ChatListResponse } from "@/lib/api/types";
import { realtime } from "@/lib/api/realtime";
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const MESSAGES_TAB_PAGE_SIZE = 20;

function dedupeById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function dedupeMetas(items: UserChatMeta[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.id || `${item.leankId}:${item.userId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function useMessagesTab() {
  const params = useLocalSearchParams<{ nav?: string }>();
  const queryClient = useQueryClient();
  const {
    unreadChatCount,
    pendingRequestCount,
    setUnreadCount,
    setPendingRequestCount,
    refreshAttentionCounts,
    currentUser,
    showLoader,
    hideLoader,
  } = useGlobalContext();
  const { isPro } = usePremium();
  const currentUserId = currentUser?.id;
  const [refreshing, setRefreshing] = useState(false);
  const [refreshStartedEmpty, setRefreshStartedEmpty] = useState(false);
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
  const chatsQueryKey = useMemo(
    () => ["messages", "tab", "chats", currentUserId] as const,
    [currentUserId],
  );
  const requestsQueryKey = useMemo(
    () => ["messages", "tab", "requests", currentUserId] as const,
    [currentUserId],
  );

  const chatsQuery = useInfiniteQuery({
    queryKey: chatsQueryKey,
    enabled: Boolean(currentUserId && isChats),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      apiClient.getChats({
        limit: MESSAGES_TAB_PAGE_SIZE,
        cursor: pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });

  const requestsQuery = useInfiniteQuery({
    queryKey: requestsQueryKey,
    enabled: Boolean(currentUserId && !isChats),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      apiClient.getRequests({
        limit: MESSAGES_TAB_PAGE_SIZE,
        cursor: pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });

  const chatRooms = useMemo<Leank[]>(() => {
    return dedupeById(chatsQuery.data?.pages.flatMap((page) => page.chats) || []);
  }, [chatsQuery.data]);

  const chatMetas = useMemo<UserChatMeta[]>(() => {
    return dedupeMetas(
      chatsQuery.data?.pages.flatMap((page) => page.metas) || [],
    );
  }, [chatsQuery.data]);

  const requests = useMemo<LeankRequest[]>(() => {
    return dedupeById(
      requestsQuery.data?.pages.flatMap((page) => page.requests) || [],
    );
  }, [requestsQuery.data]);

  useEffect(() => {
    chatIdsRef.current = new Set(chatRooms.map((chat) => chat.id));
  }, [chatRooms]);

  useEffect(() => {
    const firstPage = chatsQuery.data?.pages[0];
    if (firstPage) setUnreadCount(firstPage.unreadCount);
  }, [chatsQuery.data, setUnreadCount]);

  useEffect(() => {
    const firstPage = requestsQuery.data?.pages[0];
    if (firstPage) setPendingRequestCount(firstPage.totalPending || 0);
  }, [requestsQuery.data, setPendingRequestCount]);

  const handleNavChange = useCallback(
    (nextNav: NavbarOptions) => {
      if (nextNav === nav) return;
      router.setParams({ nav: nextNav });
    },
    [nav],
  );

  const invalidateChats = useCallback(async () => {
    if (!currentUserId) return;
    await queryClient.invalidateQueries({
      queryKey: chatsQueryKey,
      exact: true,
    });
    await refreshAttentionCounts().catch(() => {});
  }, [chatsQueryKey, currentUserId, queryClient, refreshAttentionCounts]);

  const invalidateRequests = useCallback(async () => {
    if (!currentUserId) return;
    await queryClient.invalidateQueries({
      queryKey: requestsQueryKey,
      exact: true,
    });
    await refreshAttentionCounts().catch(() => {});
  }, [currentUserId, queryClient, refreshAttentionCounts, requestsQueryKey]);

  const schedule = useCallback(
    (kind: "chats" | "requests", callback: () => Promise<void>) => {
      const timers = refreshTimersRef.current;
      if (timers[kind]) clearTimeout(timers[kind]);
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
        await apiClient.acceptRequest(request.id);
        await Promise.all([
          invalidateRequests(),
          invalidateChats(),
          queryClient.invalidateQueries({ queryKey: ["leanks", "profile"] }),
        ]);
      } finally {
        hideLoader();
      }
    },
    [hideLoader, invalidateChats, invalidateRequests, queryClient, showLoader],
  );

  const handleDeclineRequest = useCallback(
    async (request: LeankRequest) => {
      showLoader();
      try {
        await apiClient.declineRequest(request.id);
        await invalidateRequests();
      } finally {
        hideLoader();
      }
    },
    [hideLoader, invalidateRequests, showLoader],
  );

  const handleChatPress = useCallback(
    (chat: Leank) => {
      queryClient.setQueryData<
        InfiniteData<ChatListResponse, string | undefined>
      >(chatsQueryKey, (prev) => {
        if (!prev || !currentUserId) return prev;
        return {
          ...prev,
          pages: prev.pages.map((page) => ({
            ...page,
            metas: page.metas.map((meta) =>
              meta.leankId === chat.id && meta.userId === currentUserId
                ? { ...meta, readAt: new Date().toISOString() }
                : meta,
            ),
          })),
        };
      });

      router.push({
        pathname: "/messages/[chat]",
        params: { chat: chat.id },
      });
    },
    [chatsQueryKey, currentUserId, queryClient],
  );

  const handleRefresh = useCallback(async () => {
    const wasEmpty = isChats ? chatRooms.length === 0 : requests.length === 0;
    try {
      setRefreshStartedEmpty(wasEmpty);
      setRefreshing(true);
      await Promise.all([
        isChats ? chatsQuery.refetch() : requestsQuery.refetch(),
        refreshAttentionCounts(),
      ]);
    } finally {
      setRefreshing(false);
      setRefreshStartedEmpty(false);
    }
  }, [
    chatRooms.length,
    chatsQuery,
    isChats,
    refreshAttentionCounts,
    requests.length,
    requestsQuery,
  ]);

  const handleChatsEndReached = useCallback(() => {
    if (!chatsQuery.hasNextPage || chatsQuery.isFetchingNextPage) return;
    void chatsQuery.fetchNextPage();
  }, [chatsQuery]);

  const handleRequestsEndReached = useCallback(() => {
    if (!requestsQuery.hasNextPage || requestsQuery.isFetchingNextPage) return;
    void requestsQuery.fetchNextPage();
  }, [requestsQuery]);

  const retryNextPage = useCallback(() => {
    if (isChats) {
      void chatsQuery.fetchNextPage();
      return;
    }
    void requestsQuery.fetchNextPage();
  }, [chatsQuery, isChats, requestsQuery]);

  const retryInitialPage = useCallback(() => {
    if (isChats) {
      void chatsQuery.refetch();
      return;
    }
    void requestsQuery.refetch();
  }, [chatsQuery, isChats, requestsQuery]);

  useFocusEffect(
    useCallback(() => {
      if (!currentUserId) return;
      const queryKey = isChats ? chatsQueryKey : requestsQueryKey;
      void queryClient.invalidateQueries({ queryKey, exact: true });
    }, [chatsQueryKey, currentUserId, isChats, queryClient, requestsQueryKey]),
  );

  useEffect(() => {
    if (!currentUserId) return;
    const unsubscribers = [
      realtime.subscribe("connect", () => {
        schedule("chats", invalidateChats);
        schedule("requests", invalidateRequests);
      }),
      realtime.subscribe("reaction.updated", () =>
        schedule("requests", invalidateRequests),
      ),
      realtime.subscribe("attention.changed", () =>
        schedule("requests", invalidateRequests),
      ),
      realtime.subscribe("leank.updated", () =>
        schedule("chats", invalidateChats),
      ),
      realtime.subscribe("message.created", (payload) => {
        const chatId = payload?.leankId;
        if (!chatId || chatIdsRef.current.has(chatId)) {
          schedule("chats", invalidateChats);
        }
      }),
      realtime.subscribe("chatMeta.updated", () =>
        schedule("chats", invalidateChats),
      ),
      realtime.subscribe("unread.changed", () =>
        schedule("chats", invalidateChats),
      ),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      Object.values(refreshTimersRef.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [currentUserId, invalidateChats, invalidateRequests, schedule]);

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
    () => !isChats && !isPro && Boolean(requestsQuery.data?.pages[0]?.isLocked),
    [isChats, isPro, requestsQuery.data],
  );

  const isInitialLoading = isChats
    ? chatsQuery.isPending
    : requestsQuery.isPending;
  const isInitialError = isChats ? chatsQuery.isError : requestsQuery.isError;
  const isFetchingNextPage = isChats
    ? chatsQuery.isFetchingNextPage
    : requestsQuery.isFetchingNextPage;
  const isFetchNextPageError = isChats
    ? chatsQuery.isFetchNextPageError
    : requestsQuery.isFetchNextPageError;

  return {
    chatMetas,
    chatRooms,
    currentUserId,
    handleAcceptRequest,
    handleChatPress,
    handleNavChange,
    handleDeclineRequest,
    handleEndReached: isChats ? handleChatsEndReached : handleRequestsEndReached,
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
    requests,
    retryInitialPage,
    retryNextPage,
    shouldShowRequestsPaywall,
    unreadChatCount,
    visibleRequests,
  };
}
