import { Message } from "@/interfaces";
import { useGlobalContext } from "@/lib/GlobalContext";
import { useMessagesContext } from "@/lib/MessagesContext";
import { apiClient } from "@/lib/api/client";
import { ChatDetailResponse, ChatMessagePage } from "@/lib/api/types";
import { realtime } from "@/lib/api/realtime";
import {
  InfiniteData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard } from "react-native";
import {
  ChatListItem,
  ReplySwipeHandle,
  injectDateSeparators,
} from "./chatItems";
import { chatDetailQueryKey } from "./queryKeys";

const CHAT_MESSAGES_PAGE_SIZE = 50;

type ChatMessagesInfiniteData = InfiniteData<
  ChatMessagePage,
  string | undefined
>;

const dedupeMessages = (messages: Message[]) => {
  const messagesById = new Map<string, Message>();
  messages.forEach((message) => messagesById.set(message.id, message));
  return Array.from(messagesById.values());
};

const appendMessageToPages = (
  data: ChatMessagesInfiniteData | undefined,
  message: Message,
): ChatMessagesInfiniteData => {
  if (!data) {
    return {
      pages: [{ messages: [message], nextCursor: null, hasMore: false }],
      pageParams: [undefined],
    };
  }

  const exists = data.pages.some((page) =>
    page.messages.some((item) => item.id === message.id),
  );
  if (exists) return data;

  return {
    ...data,
    pages: data.pages.map((page, index) =>
      index === 0
        ? { ...page, messages: [...page.messages, message] }
        : page,
    ),
  };
};

export function useChatScreen() {
  const { currentLeank, setCurrentLeank } = useMessagesContext();
  const { currentUser, openUserPreview, setAttentionCounts } =
    useGlobalContext();
  const currentUserId = currentUser?.id;
  const params = useLocalSearchParams<{ chat?: string }>();
  const chatId = Array.isArray(params.chat) ? params.chat[0] : params.chat;
  const queryClient = useQueryClient();
  const messagesQueryKey = useMemo(
    () => ["messages", "chat", chatId] as const,
    [chatId],
  );
  const detailQueryKey = useMemo(() => chatDetailQueryKey(chatId), [chatId]);
  const activeContextLeank =
    currentLeank?.id === chatId ? currentLeank : undefined;
  const [messageContent, setMessageContent] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const listRef = useRef<any>(null);
  const openSwipeRef = useRef<ReplySwipeHandle | null>(null);
  const readWriteInFlightRef = useRef(false);

  const chatDetailQuery = useQuery({
    queryKey: detailQueryKey,
    enabled: Boolean(chatId),
    initialData: activeContextLeank ? { chat: activeContextLeank } : undefined,
    queryFn: () => apiClient.getChat(chatId!),
  });

  const activeLeank = chatDetailQuery.data?.chat || activeContextLeank;

  const messagesQuery = useInfiniteQuery({
    queryKey: messagesQueryKey,
    enabled: Boolean(chatId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      apiClient.getMessages(chatId!, pageParam, CHAT_MESSAGES_PAGE_SIZE),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });

  const rawMessages = useMemo<Message[]>(() => {
    const pages = messagesQuery.data?.pages || [];
    return dedupeMessages(
      [...pages].reverse().flatMap((page) => page.messages),
    );
  }, [messagesQuery.data]);

  const messages = useMemo<ChatListItem[]>(() => {
    return injectDateSeparators(rawMessages);
  }, [rawMessages]);

  const markAsRead = useCallback(async () => {
    if (!chatId || readWriteInFlightRef.current) return;
    readWriteInFlightRef.current = true;
    try {
      const response = await apiClient.markChatRead(chatId);
      setAttentionCounts(response);
    } finally {
      readWriteInFlightRef.current = false;
    }
  }, [chatId, setAttentionCounts]);

  const appendMessageToCache = useCallback(
    (message: Message) => {
      queryClient.setQueryData<ChatMessagesInfiniteData>(
        messagesQueryKey,
        (prev) => appendMessageToPages(prev, message),
      );
    },
    [messagesQueryKey, queryClient],
  );

  useEffect(() => {
    const chat = chatDetailQuery.data?.chat;
    if (!chat || chat.id !== chatId) return;
    setCurrentLeank(chat);
  }, [chatDetailQuery.data, chatId, setCurrentLeank]);

  useEffect(() => {
    if (!messagesQuery.isSuccess) return;
    void markAsRead().catch((error) => console.log(error));
  }, [markAsRead, messagesQuery.dataUpdatedAt, messagesQuery.isSuccess]);

  useEffect(() => {
    if (!chatId) return;

    const unsubscribeRoom = realtime.subscribeLeank(chatId);
    const unsubscribeLeank = realtime.subscribe("leank.updated", (payload) => {
      const updatedId = payload?.leankId || payload?.id;
      if (updatedId !== chatId) return;
      void queryClient.invalidateQueries({
        queryKey: detailQueryKey,
        exact: true,
      });
    });
    const unsubscribeMessages = realtime.subscribe(
      "message.created",
      (payload) => {
        if (payload?.leankId !== chatId || !payload?.id) return;
        appendMessageToCache(payload as Message);
        void markAsRead().catch(() => {});
      },
    );

    return () => {
      unsubscribeLeank();
      unsubscribeMessages();
      unsubscribeRoom();
    };
  }, [appendMessageToCache, chatId, detailQueryKey, markAsRead, queryClient]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () =>
        setTimeout(() => {
          listRef.current?.scrollToEnd({ animate: true });
        }, 100),
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  const sendMessage = useCallback(async () => {
    if (!chatId || !currentUser || messageContent.trim() === "") return;

    try {
      const response = await apiClient.sendMessage(chatId, {
        content: messageContent,
        replyToId: replyTo?.id,
      });

      appendMessageToCache(response.message);
      setCurrentLeank(response.chat);
      queryClient.setQueryData<ChatDetailResponse>(detailQueryKey, {
        chat: response.chat,
      });
      setMessageContent("");
      setReplyTo(null);
      openSwipeRef.current?.close();
    } catch (error) {
      console.log(error);
    } finally {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animate: true });
      }, 100);
    }
  }, [
    appendMessageToCache,
    chatId,
    currentUser,
    messageContent,
    queryClient,
    replyTo,
    detailQueryKey,
    setCurrentLeank,
  ]);

  const fetchOlderMessages = useCallback(() => {
    if (!messagesQuery.hasNextPage || messagesQuery.isFetchingNextPage) return;
    void messagesQuery.fetchNextPage();
  }, [messagesQuery]);

  const retryOlderMessages = useCallback(() => {
    void messagesQuery.fetchNextPage();
  }, [messagesQuery]);

  const retryMessages = useCallback(() => {
    void messagesQuery.refetch();
  }, [messagesQuery]);

  const openSettings = useCallback(() => {
    if (!chatId) return;
    router.push({
      pathname: "/messages/settings/[chat]",
      params: { chat: chatId },
    });
  }, [chatId]);

  return {
    chatId,
    currentLeank: activeLeank,
    currentUser,
    currentUserId,
    fetchOlderMessages,
    isFetchingOlderMessages: messagesQuery.isFetchingNextPage,
    isLoading: messagesQuery.isPending && !messagesQuery.data,
    isMessagesError: messagesQuery.isError && !messagesQuery.data,
    isOlderMessagesError: messagesQuery.isFetchNextPageError,
    listRef,
    messageContent,
    messages,
    openSettings,
    openSwipeRef,
    openUserPreview,
    replyTo,
    retryMessages,
    retryOlderMessages,
    sendMessage,
    setMessageContent,
    setReplyTo,
  };
}
