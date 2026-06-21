import { Leank, Message } from "@/interfaces";
import { useGlobalContext } from "@/lib/GlobalContext";
import { useMessagesContext } from "@/lib/MessagesContext";
import { apiClient } from "@/lib/api/client";
import { realtime } from "@/lib/api/realtime";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard } from "react-native";
import {
  ChatListItem,
  ReplySwipeHandle,
  injectDateSeparators,
  isRealMessage,
} from "./chatItems";

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
      if (prev.length === decorated.length && prevLast === nextLast)
        return prev;
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

    const unsubscribeRoom = realtime.subscribeLeank(chatId);
    const unsubscribeLeank = realtime.subscribe("leank.updated", (payload) => {
      const updatedId = payload?.leankId || payload?.id || payload?.$id;
      if (updatedId !== chatId) return;
      void loadLeank().catch(() => {});
    });
    const unsubscribeMessages = realtime.subscribe(
      "message.created",
      (payload) => {
        if (payload?.leankId === chatId) {
          void loadMessages().catch(() => {});
        }
      },
    );

    return () => {
      unsubscribeLeank();
      unsubscribeMessages();
      unsubscribeRoom();
    };
  }, [chatId, loadLeank, loadMessages]);

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
        replyToMessageId: replyTo?.$id,
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
