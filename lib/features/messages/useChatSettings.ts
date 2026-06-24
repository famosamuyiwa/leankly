import { NavbarOptions } from "@/constants/enums";
import { BasicUser, Participants } from "@/interfaces";
import { useGlobalContext } from "@/lib/GlobalContext";
import { useMessagesContext } from "@/lib/MessagesContext";
import { apiClient } from "@/lib/api/client";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

export function useChatSettings() {
  const { currentLeank, setCurrentLeank } = useMessagesContext();
  const queryClient = useQueryClient();
  const { currentUser, openUserPreview, showLoader, hideLoader } =
    useGlobalContext();
  const currentUserId = currentUser?.id;
  const params = useLocalSearchParams<{ chat?: string }>();
  const chatId = Array.isArray(params.chat) ? params.chat[0] : params.chat;
  const [leankers, setLeankers] = useState<Participants[]>([]);
  const [isLeankLoading, setIsLeankLoading] = useState(true);
  const activeLeank = currentLeank?.id === chatId ? currentLeank : undefined;

  const loadLeank = useCallback(async () => {
    if (!chatId) return;
    if (activeLeank) {
      setIsLeankLoading(false);
      return;
    }

    try {
      const { chat } = await apiClient.getChat(chatId);
      setCurrentLeank(chat);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLeankLoading(false);
    }
  }, [activeLeank, chatId, setCurrentLeank]);

  const loadParticipants = useCallback(async () => {
    if (!chatId || !currentUserId) return;
    const response = await apiClient.getParticipants(chatId);
    setLeankers(response.participants);
  }, [chatId, currentUserId]);

  useEffect(() => {
    // Context is only a fast path; route params keep settings valid on deep links and reloads.
    void loadLeank();
  }, [loadLeank]);

  useEffect(() => {
    if (!activeLeank) return;
    void loadParticipants().catch((error) => console.log(error));
  }, [activeLeank, loadParticipants]);

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
      goBackToChats();
    } catch (error) {
      console.error(error);
    } finally {
      hideLoader();
    }
  }, [chatId, currentUser, goBackToChats, hideLoader, showLoader]);

  const removeUser = useCallback(
    async (leanker: Participants) => {
      if (!chatId || !currentUser) return;
      try {
        await apiClient.removeParticipant(chatId, leanker.user.id);
        setLeankers((prev) => prev.filter((item) => item.id !== leanker.id));
      } catch (error) {
        console.error(error);
      }
    },
    [chatId, currentUser],
  );

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

  const leankerCount = useMemo(() => leankers.length + 1, [leankers.length]);

  return {
    activeLeank,
    chatId,
    currentUserId,
    handleClose,
    handleLeave,
    handleRemove,
    isLeankLoading,
    leankerCount,
    leankers,
    openLeankerPreview,
  };
}
