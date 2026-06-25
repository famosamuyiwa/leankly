import { NavbarOptions } from "@/constants/enums";
import { BasicUser, Participants } from "@/interfaces";
import { useGlobalContext } from "@/lib/GlobalContext";
import { useMessagesContext } from "@/lib/MessagesContext";
import { apiClient } from "@/lib/api/client";
import {
  InfiniteData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { PaginatedParticipantsResponse } from "@/lib/api/types";
import { realtime } from "@/lib/api/realtime";
import { chatDetailQueryKey, chatParticipantsQueryKey } from "./queryKeys";

const CHAT_SETTINGS_PARTICIPANTS_PAGE_SIZE = 20;

type ParticipantsInfiniteData = InfiniteData<
  PaginatedParticipantsResponse,
  string | undefined
>;

const dedupeParticipants = (participants: Participants[]) => {
  const seen = new Set<string>();
  return participants.filter((participant) => {
    if (seen.has(participant.id)) return false;
    seen.add(participant.id);
    return true;
  });
};

const removeParticipantFromPages = (
  data: ParticipantsInfiniteData | undefined,
  leanker: Participants,
) => {
  if (!data) return data;
  const exists = data.pages.some((page) =>
    page.participants.some(
      (participant) =>
        participant.id === leanker.id ||
        participant.user.id === leanker.user.id,
    ),
  );
  if (!exists) return data;

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      participants: page.participants.filter(
        (participant) =>
          participant.id !== leanker.id &&
          participant.user.id !== leanker.user.id,
      ),
      totalParticipants: Math.max(0, page.totalParticipants - 1),
    })),
  };
};

export function useChatSettings() {
  const { currentLeank, setCurrentLeank } = useMessagesContext();
  const queryClient = useQueryClient();
  const { currentUser, openUserPreview, showLoader, hideLoader } =
    useGlobalContext();
  const currentUserId = currentUser?.id;
  const params = useLocalSearchParams<{ chat?: string }>();
  const chatId = Array.isArray(params.chat) ? params.chat[0] : params.chat;
  const detailQueryKey = useMemo(() => chatDetailQueryKey(chatId), [chatId]);
  const participantsQueryKey = useMemo(
    () => chatParticipantsQueryKey(chatId),
    [chatId],
  );
  const activeContextLeank =
    currentLeank?.id === chatId ? currentLeank : undefined;
  const [refreshing, setRefreshing] = useState(false);
  const [refreshStartedEmpty, setRefreshStartedEmpty] = useState(false);

  const chatDetailQuery = useQuery({
    queryKey: detailQueryKey,
    enabled: Boolean(chatId),
    initialData: activeContextLeank ? { chat: activeContextLeank } : undefined,
    queryFn: () => apiClient.getChat(chatId!),
  });

  const activeLeank = chatDetailQuery.data?.chat || activeContextLeank;

  const participantsQuery = useInfiniteQuery({
    queryKey: participantsQueryKey,
    enabled: Boolean(chatId && currentUserId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      apiClient.getParticipants(chatId!, {
        limit: CHAT_SETTINGS_PARTICIPANTS_PAGE_SIZE,
        cursor: pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });

  const leankers = useMemo(() => {
    return dedupeParticipants(
      participantsQuery.data?.pages.flatMap((page) => page.participants) || [],
    );
  }, [participantsQuery.data]);

  useEffect(() => {
    const chat = chatDetailQuery.data?.chat;
    if (!chat || chat.id !== chatId) return;
    setCurrentLeank(chat);
  }, [chatDetailQuery.data, chatId, setCurrentLeank]);

  useEffect(() => {
    if (!chatId) return;
    const unsubscribeRoom = realtime.subscribeLeank(chatId);
    const unsubscribeParticipants = realtime.subscribe(
      "participants.updated",
      (payload) => {
        if (payload?.leankId !== chatId) return;
        void queryClient.invalidateQueries({
          queryKey: participantsQueryKey,
          exact: true,
        });
        void queryClient.invalidateQueries({
          queryKey: detailQueryKey,
          exact: true,
        });
      },
    );

    return () => {
      unsubscribeParticipants();
      unsubscribeRoom();
    };
  }, [chatId, detailQueryKey, participantsQueryKey, queryClient]);

  const goBackToChats = useCallback(() => {
    router.dismissTo({
      pathname: "/messages",
      params: {
        nav: NavbarOptions.CHATS,
      },
    });
  }, []);

  const leaveLeank = useCallback(async () => {
    if (!chatId || !currentUser) return;
    showLoader();
    try {
      await apiClient.leaveChat(chatId);
      await queryClient.invalidateQueries({
        queryKey: ["leanks", "profile"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["messages", "tab", "chats"],
      });
      goBackToChats();
    } catch (error) {
      console.error(error);
    } finally {
      hideLoader();
    }
  }, [chatId, currentUser, goBackToChats, hideLoader, queryClient, showLoader]);

  const closeLeank = useCallback(async () => {
    if (!chatId || !currentUser) return;
    showLoader();
    try {
      await apiClient.closeChat(chatId);
      await queryClient.invalidateQueries({
        queryKey: ["messages", "tab", "chats"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["leanks", "profile"],
      });
      goBackToChats();
    } catch (error) {
      console.error(error);
    } finally {
      hideLoader();
    }
  }, [
    chatId,
    currentUser,
    goBackToChats,
    hideLoader,
    queryClient,
    showLoader,
  ]);

  const removeUser = useCallback(
    async (leanker: Participants) => {
      if (!chatId || !currentUser) return;
      const previousParticipants =
        queryClient.getQueryData<ParticipantsInfiniteData>(
          participantsQueryKey,
        );
      queryClient.setQueryData<ParticipantsInfiniteData>(
        participantsQueryKey,
        (prev) => removeParticipantFromPages(prev, leanker),
      );

      try {
        await apiClient.removeParticipant(chatId, leanker.user.id);
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: participantsQueryKey,
            exact: true,
          }),
          queryClient.invalidateQueries({
            queryKey: detailQueryKey,
            exact: true,
          }),
          queryClient.invalidateQueries({
            queryKey: ["messages", "tab", "chats"],
          }),
        ]);
      } catch (error) {
        queryClient.setQueryData(participantsQueryKey, previousParticipants);
        console.error(error);
      }
    },
    [
      chatId,
      currentUser,
      detailQueryKey,
      participantsQueryKey,
      queryClient,
    ],
  );

  const handleRefresh = useCallback(async () => {
    const wasEmpty = leankers.length === 0;
    try {
      setRefreshStartedEmpty(wasEmpty);
      setRefreshing(true);
      await Promise.all([chatDetailQuery.refetch(), participantsQuery.refetch()]);
    } finally {
      setRefreshing(false);
      setRefreshStartedEmpty(false);
    }
  }, [chatDetailQuery, leankers.length, participantsQuery]);

  const handleEndReached = useCallback(() => {
    if (
      !participantsQuery.hasNextPage ||
      participantsQuery.isFetchingNextPage
    ) {
      return;
    }
    void participantsQuery.fetchNextPage();
  }, [participantsQuery]);

  const retryInitialParticipants = useCallback(() => {
    void participantsQuery.refetch();
  }, [participantsQuery]);

  const retryNextParticipantsPage = useCallback(() => {
    void participantsQuery.fetchNextPage();
  }, [participantsQuery]);

  const handleLeave = useCallback(() => {
    Alert.alert("Leave", "Are you sure you want to leave this leank?", [
      { text: "Cancel", style: "cancel" },
      { text: "Leave", style: "destructive", onPress: leaveLeank },
    ]);
  }, [leaveLeank]);

  const handleClose = useCallback(() => {
    Alert.alert("Close", "Are you sure you want to close this leank?", [
      { text: "Cancel", style: "cancel" },
      { text: "Close", style: "destructive", onPress: closeLeank },
    ]);
  }, [closeLeank]);

  const handleRemove = useCallback(
    (item: Participants) => {
      Alert.alert(
        "Remove",
        `Are you sure you want to remove ${item.user.name} from this leank?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => removeUser(item),
          },
        ],
      );
    },
    [removeUser],
  );

  const openLeankerPreview = useCallback(
    (user: BasicUser) => {
      openUserPreview(user);
    },
    [openUserPreview],
  );

  const participantTotal =
    participantsQuery.data?.pages[0]?.totalParticipants ??
    activeLeank?.participantIds?.length ??
    leankers.length;
  const leankerCount = participantTotal + 1;

  return {
    activeLeank,
    chatId,
    currentUserId,
    handleEndReached,
    handleClose,
    handleLeave,
    handleRemove,
    handleRefresh,
    isFetchNextPageError: participantsQuery.isFetchNextPageError,
    isFetchingNextPage: participantsQuery.isFetchingNextPage,
    isInitialParticipantsError:
      participantsQuery.isError && !participantsQuery.data,
    isLeankLoading: chatDetailQuery.isPending && !chatDetailQuery.data,
    isParticipantsLoading:
      participantsQuery.isPending && leankers.length === 0,
    leankerCount,
    leankers,
    openLeankerPreview,
    refreshStartedEmpty,
    refreshing,
    retryInitialParticipants,
    retryNextParticipantsPage,
  };
}
