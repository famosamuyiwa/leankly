import { Leank, Message } from "@/interfaces";
import { useGlobalContext } from "@/lib/GlobalContext";
import { useMessagesContext } from "@/lib/MessagesContext";
import { apiClient } from "@/lib/api/client";
import { ChatMessagePage } from "@/lib/api/types";
import { realtime } from "@/lib/api/realtime";
import {
  InfiniteData,
  useInfiniteQuery,
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
  const [messageContent, setMessageContent] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isLeankLoading, setIsLeankLoading] = useState(true);
  const listRef = useRef<any>(null);
  const openSwipeRef = useRef<ReplySwipeHandle | null>(null);
  const readWriteInFlightRef = useRef(false);

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

  const loadLeank = useCallback(async () => {
    if (!chatId) return;
    const { chat } = await apiClient.getChat(chatId);
    setCurrentLeank(chat as Leank);
  }, [chatId, setCurrentLeank]);

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
    let isMounted = true;
    setIsLeankLoading(true);

    void loadLeank()
      .catch((error) => console.log(error))
      .finally(() => {
        if (isMounted) setIsLeankLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [loadLeank]);

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
      void loadLeank().catch(() => {});
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
  }, [appendMessageToCache, chatId, loadLeank, markAsRead]);

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
    replyTo,
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
    currentLeank,
    currentUser,
    currentUserId,
    fetchOlderMessages,
    isFetchingOlderMessages: messagesQuery.isFetchingNextPage,
    isLoading: isLeankLoading || messagesQuery.isPending,
    isMessagesError: messagesQuery.isError,
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
