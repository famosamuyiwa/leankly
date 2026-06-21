import { appwriteConfig, client } from "@/appwrite/config";
import { Leank, Message } from "@/interfaces";
import { useGlobalContext } from "@/lib/GlobalContext";
import { useMessagesContext } from "@/lib/MessagesContext";
import { apiClient } from "@/lib/api/client";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard } from "react-native";
import {
  ChatListItem,
  ReplySwipeHandle,
  injectDateSeparators,
  isRealMessage,
} from "./chatItems";

const hasMutationEvent = (events: string[] = []) =>
  events.some((event) =>
    ["create", "update", "delete"].some(
      (action) => event.endsWith(action) || event.includes(`.${action}`)
    )
  );

export function useChatScreen() {
  const { currentLeank, setCurrentLeank } = useMessagesContext();
  const { currentUser, openUserPreview, setUnreadCount } = useGlobalContext();
  const currentUserId = currentUser?.$id;
  const params = useLocalSearchParams<{ chat?: string }>();
  const chatId = Array.isArray(params.chat) ? params.chat[0] : params.chat;
  const [messages, setMessages] = useState<ChatListItem[]>([]);
  const [messageContent, setMessageContent] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const listRef = useRef<any>(null);
  const openSwipeRef = useRef<ReplySwipeHandle | null>(null);
  const readWriteInFlightRef = useRef(false);

  const applyMessages = useCallback((rawNext: Message[]) => {
    const decorated = injectDateSeparators(rawNext);
    setMessages((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) return decorated;
      const prevLast = prev[prev.length - 1]?.$id;
      const nextLast = decorated[decorated.length - 1]?.$id;
      if (prev.length === decorated.length && prevLast === nextLast) return prev;
      return decorated;
    });
  }, []);

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
      setUnreadCount(response.unreadCount);
    } finally {
      readWriteInFlightRef.current = false;
    }
  }, [chatId, setUnreadCount]);

  const loadMessages = useCallback(async () => {
    if (!chatId) return;
    const page = await apiClient.getMessages(chatId);
    applyMessages(page.messages);
    // Read receipt writes are centralized in the facade and guarded locally against overlap.
    await markAsRead();
  }, [applyMessages, chatId, markAsRead]);

  useEffect(() => {
    let isMounted = true;

    const loadInitialChat = async () => {
      try {
        await Promise.all([loadMessages(), loadLeank()]);
      } catch (error) {
        console.log(error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadInitialChat();
    return () => {
      isMounted = false;
    };
  }, [loadLeank, loadMessages]);

  useEffect(() => {
    if (!chatId) return;

    const leankChannel = `databases.${appwriteConfig.db}.tables.${appwriteConfig.tables.leanks}.rows.${chatId}`;
    const messageChannel = `databases.${appwriteConfig.db}.tables.${appwriteConfig.tables.messages}.rows`;

    const unsubscribeLeank = client.subscribe(leankChannel, (event) => {
      if (!hasMutationEvent(event.events)) return;
      void loadLeank().catch(() => {});
    });

    const unsubscribeMessages = client.subscribe(messageChannel, (event) => {
      if (!hasMutationEvent(event.events)) return;
      const payload = event.payload as Partial<Message>;
      // Message row events are global, so filter before fetching to avoid noisy realtime reads.
      if (payload?.leankId === chatId) {
        void loadMessages().catch(() => {});
      }
    });

    return () => {
      unsubscribeLeank();
      unsubscribeMessages();
    };
  }, [chatId, loadLeank, loadMessages]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () =>
        setTimeout(() => {
          listRef.current?.scrollToEnd({ animate: true });
        }, 100)
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
        replyToMessageId: replyTo?.$id,
        replyToSenderId: replyTo?.senderId,
        replyToSenderName: replyTo?.senderName,
        replyToContent: replyTo?.content,
      });

      setMessages((prev) => {
        const safePrev = Array.isArray(prev) ? prev.filter(isRealMessage) : [];
        return injectDateSeparators([...safePrev, response.message]);
      });
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
  }, [chatId, currentUser, messageContent, replyTo, setCurrentLeank]);

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
    isLoading,
    listRef,
    messageContent,
    messages,
    openSettings,
    openSwipeRef,
    openUserPreview,
    replyTo,
    sendMessage,
    setMessageContent,
    setReplyTo,
  };
}
