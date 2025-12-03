import {
  appwriteConfig,
  client,
  db,
  sendPushNotification,
} from "@/appwrite/config";
import { Colors } from "@/constants/common";
import { PushNotificationTypes } from "@/constants/enums";
import { Leank, Message } from "@/interfaces";
import { useGlobalContext } from "@/lib/GlobalContext";
import { useMessagesContext } from "@/lib/MessagesContext";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { LegendList } from "@legendapp/list";
import { useHeaderHeight } from "@react-navigation/elements";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { cssInterop } from "nativewind";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  Animated as RNAnimated,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ID, Query } from "react-native-appwrite";
import { Swipeable } from "react-native-gesture-handler";
import Reanimated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Chat() {
  // Interop the Image component to recognize the 'className' prop
  cssInterop(Image, {
    className: { target: "style" },
  });
  const insets = useSafeAreaInsets();
  const { currentLeank, setCurrentLeank } = useMessagesContext();
  const { currentUser } = useGlobalContext();

  const { chat: chatId } = useLocalSearchParams();

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageContent, setMessageContent] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const headerHeight = useHeaderHeight();
  const listRef = useRef<any>(null);
  const openSwipeRef = useRef<Swipeable | null>(null);

  useEffect(() => {
    handleFirstLoad();
  }, []);

  useEffect(() => {
    const channel = `databases.${appwriteConfig.db}.tables.${appwriteConfig.tables.leanks}.rows.${chatId}`;
    const unsubscribe = client.subscribe(channel, () => {
      getMessages();
    });

    const KeyboardDidShowlistener = Keyboard.addListener(
      "keyboardDidShow",
      () =>
        setTimeout(() => {
          listRef.current?.scrollToEnd({ animate: true });
        }, 100)
    );

    return () => {
      unsubscribe();
      KeyboardDidShowlistener.remove();
    };
  }, [chatId]);

  const handleFirstLoad = async () => {
    try {
      setIsLoading(true);
      await getMessages();
      await getLeank();
    } catch (e) {
      console.log(e);
    } finally {
      setIsLoading(false);
    }
  };

  const getLeank = async () => {
    try {
      const data = await db.getRow({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.leanks,
        rowId: chatId as string,
        queries: [
          Query.select(["*", "owner.$id", "owner.avatar", "owner.name"]),
        ],
      });

      setCurrentLeank(data as unknown as Leank);
    } catch (e) {
      console.log(e);
    }
  };

  const getMessages = async () => {
    try {
      const { rows, total } = await db.listRows({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.messages,
        queries: [
          Query.equal("leankId", chatId),
          Query.limit(50),
          Query.orderDesc("$createdAt"),
        ],
      });

      const incoming = Array.isArray(rows)
        ? (rows as unknown as Message[])
        : [];
      applyMessages([...incoming].reverse());

      if (
        total > 0 &&
        (rows as unknown as Message[])[total - 1].senderId !== currentUser?.$id
      ) {
        markAsRead();
      }
    } catch (e) {
      console.log(e);
    }
  };

  const applyMessages = (rawNext: Message[]) => {
    const decorated = injectDateSeparators(rawNext);
    setMessages((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) return decorated;
      if (!Array.isArray(decorated)) return prev;
      const prevLast = prev[prev.length - 1]?.$id;
      const nextLast = decorated[decorated.length - 1]?.$id;
      const sameLength = prev.length === decorated.length;
      const sameLast = prevLast && nextLast && prevLast === nextLast;
      if (sameLength && sameLast) return prev;
      return decorated;
    });
  };

  const sendMessage = async () => {
    if (messageContent.trim() === "" || !currentUser) return;

    try {
      const baseMessage = {
        content: messageContent,
        senderId: currentUser.$id,
        senderName: currentUser.name,
        senderPhoto: currentUser.avatar,
        leankId: chatId,
      } as any;

      if (replyTo) {
        baseMessage.replyToMessageId = replyTo.$id;
        baseMessage.replyToSenderId = replyTo.senderId;
        baseMessage.replyToSenderName = replyTo.senderName;
        baseMessage.replyToContent = replyTo.content;
      }

      let msg;
      try {
        msg = await db.createRow({
          databaseId: appwriteConfig.db,
          tableId: appwriteConfig.tables.messages,
          rowId: ID.unique(),
          data: baseMessage,
        });
      } catch (e) {
        // If backend rejects replyTo, retry without it
        if (replyTo) {
          msg = await db.createRow({
            databaseId: appwriteConfig.db,
            tableId: appwriteConfig.tables.messages,
            rowId: ID.unique(),
            data: {
              ...baseMessage,
              replyToMessageId: undefined,
              replyToSenderId: undefined,
              replyToSenderName: undefined,
              replyToContent: undefined,
            },
          });
        } else {
          throw e;
        }
      }

      const createdAt = (msg as any)?.$createdAt || new Date().toISOString();
      const messageToUse = {
        ...(msg as any),
        $createdAt: createdAt,
        replyToMessageId: baseMessage.replyToMessageId,
        replyToSenderId: baseMessage.replyToSenderId,
        replyToSenderName: baseMessage.replyToSenderName,
        replyToContent: baseMessage.replyToContent,
      } as Message;

      setMessages((prev) => {
        const safePrev = Array.isArray(prev)
          ? prev.filter((m) => m.type !== "system-date")
          : [];
        return injectDateSeparators([...safePrev, messageToUse]);
      });

      setMessageContent("");
      setReplyTo(null);
      openSwipeRef.current?.close();

      //update leank's last message
      db.updateRow({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.leanks,
        rowId: chatId as string,
        data: {
          lastMessage: messageToUse,
          $updatedAt: new Date().toISOString(),
        },
      });

      // alert participants
      sendPushNotification({
        type: PushNotificationTypes.CHAT,
        data: (msg as unknown as Message) || baseMessage,
      });
    } catch (e) {
      console.log(e);
    } finally {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animate: true });
      }, 100);
    }
  };

  const markAsRead = async () => {
    if (!currentUser) return;
    const { rows, total } = await db.listRows({
      databaseId: appwriteConfig.db,
      tableId: appwriteConfig.tables.userChatMeta,
      queries: [
        Query.equal("leankId", chatId),
        Query.equal("userId", currentUser.$id),
      ],
    });

    if (total > 0) {
      await db.updateRow({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.userChatMeta,
        rowId: rows[0].$id,
        data: {
          leankId: chatId,
          userId: currentUser.$id,
          readAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString(),
        },
      });
    } else {
      await db.createRow({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.userChatMeta,
        rowId: ID.unique(),
        data: {
          leankId: chatId,
          userId: currentUser.$id,
          readAt: new Date().toISOString(),
        },
      });
    }
  };

  const memoizedCover = useMemo(
    () => (
      <Image
        source={{ uri: currentLeank?.cover }}
        className="size-14 rounded-full"
      />
    ),
    [currentLeank]
  );

  const renderItem = ({ item }: { item: Message }) => (
    <MessageBubble
      item={item}
      currentUserId={currentUser?.$id}
      onReplySelect={(msg) => setReplyTo(msg)}
      openSwipeRef={openSwipeRef}
    />
  );

  if (!chatId) {
    return <Text>We could not find this chat room</Text>;
  }

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Reanimated.View
      layout={LinearTransition}
      entering={FadeIn.duration(400)}
      className="flex-1 px-5  bg-white"
      style={{ paddingTop: insets.top }}
    >
      <View className="gap-5 border-b-[0.4px] mb-5 border-gray-200 flex-row py-2 items-center">
        <TouchableOpacity activeOpacity={0.6} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={30} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            router.push("/messages/settings/[chat]");
          }}
          className="flex-row gap-5 items-center flex-1"
        >
          {memoizedCover}
          <View>
            <Text className="font-plus-jakarta-bold text-lg">
              {currentLeank?.title}
            </Text>
            <Text className="font-plus-jakarta-regular color-gray-400 text-sm">
              {Number(currentLeank?.participantIds?.length) + 1} leankers
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior="padding"
        keyboardVerticalOffset={headerHeight}
      >
        {messages && (
          <LegendList
            ref={listRef}
            data={Array.isArray(messages) ? messages : []}
            initialScrollIndex={
              Array.isArray(messages) && messages.length > 0
                ? messages.length - 1
                : undefined
            }
            renderItem={renderItem}
            keyExtractor={(item) => item?.$id ?? "unknown"}
            recycleItems={true}
            estimatedItemSize={100}
            alignItemsAtEnd
            maintainScrollAtEnd
            maintainScrollAtEndThreshold={0.5}
            maintainVisibleContentPosition
            showsVerticalScrollIndicator={false}
          />
        )}

        {replyTo && (
          <View
            className="bg-gray-100 border border-gray-200 rounded-2xl p-3 my-2 flex-row gap-3 items-start"
            style={{
              borderLeftColor: getUserColor(replyTo.senderId),
              borderLeftWidth: 3,
            }}
          >
            <View className="flex-1">
              <Text
                className="font-plus-jakarta-semibold text-gray-600"
                style={{ color: getUserColor(replyTo.senderId) }}
              >
                Replying to{" "}
                {replyTo.senderId === currentUser?.$id
                  ? "yourself"
                  : replyTo.senderName}
              </Text>
              <Text
                className="text-gray-500 font-plus-jakarta-regular mt-1"
                numberOfLines={2}
              >
                {replyTo.content}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setReplyTo(null);
                openSwipeRef.current?.close();
              }}
            >
              <Ionicons name="close" size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}

        <View className="border-[1px] border-gray-200 bg-gray-100 rounded-full flex-row items-center gap-2 p-2 my-2 ">
          <TextInput
            placeholder="Message..."
            value={messageContent}
            onChangeText={setMessageContent}
            className="min-h-10 flex-1 p-2 flex-shrink-1"
            numberOfLines={2}
            multiline
            placeholderTextColor={"#9CA3AF"}
          />
          <Pressable
            disabled={messageContent === ""}
            onPress={sendMessage}
            className="size-12 items-center justify-center"
          >
            <FontAwesome
              name="paper-plane"
              color={messageContent === "" ? "gray" : Colors.primary}
              size={20}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Reanimated.View>
  );
}

const colorPalette = [
  "#ef4444", // red-500
  "#f97316", // orange-500
  "#eab308", // amber-500
  "#22c55e", // green-500
  "#06b6d4", // cyan-500
  "#3b82f6", // blue-500
  "#a855f7", // purple-500
  "#ec4899", // pink-500
];

const getUserColor = (id?: string | null) => {
  if (!id) return Colors.primary;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % colorPalette.length;
  return colorPalette[index];
};

type MessageBubbleProps = {
  item: Message;
  currentUserId?: string;
  onReplySelect: (msg: Message) => void;
  openSwipeRef: React.MutableRefObject<Swipeable | null>;
};

const MessageBubble = React.memo(
  ({
    item,
    currentUserId,
    onReplySelect,
    openSwipeRef,
  }: MessageBubbleProps) => {
    const isSystem =
      item.senderId === "system" ||
      item.type === "system" ||
      item.type === "system-date";
    const isSender = item.senderId === currentUserId;
    const replyTarget = item.replyToMessageId
      ? {
          messageId: item.replyToMessageId,
          senderId: item.replyToSenderId,
          senderName: item.replyToSenderName,
          content: item.replyToContent,
        }
      : null;
    const senderColor = getUserColor(item.senderId);
    const replyColor = getUserColor(replyTarget?.senderId);
    const swipeRef = useRef<Swipeable | null>(null);

    const handleReplySelect = () => {
      if (openSwipeRef.current && openSwipeRef.current !== swipeRef.current) {
        openSwipeRef.current.close();
      }
      openSwipeRef.current = swipeRef.current;
      onReplySelect(item);
      swipeRef.current?.close();
    };

    if (isSystem) {
      return (
        <View className="w-full items-center mb-5 px-5">
          <Text className="text-gray-500 text-xs font-plus-jakarta-regular text-center">
            {item.content}
          </Text>
        </View>
      );
    }

    return (
      <Swipeable
        ref={swipeRef}
        enabled
        overshootLeft={false}
        leftThreshold={20}
        renderLeftActions={(progress, dragX) => {
          const scale = dragX.interpolate({
            inputRange: [0, 40, 120],
            outputRange: [0.5, 0.9, 1.1],
            extrapolate: "clamp",
          });
          return (
            <RNAnimated.View
              style={{
                justifyContent: "center",
                paddingHorizontal: 16,
                transform: [{ scale }],
              }}
            >
              <Ionicons
                name="return-up-back-outline"
                size={20}
                color={Colors.primary}
              />
            </RNAnimated.View>
          );
        }}
        onSwipeableOpen={() => {
          handleReplySelect();
          requestAnimationFrame(() => swipeRef.current?.close());
        }}
      >
        <View
          className={`flex-row gap-2 mb-5 ${isSender ? "justify-end" : "justify-start"}`}
        >
          {!isSender && (
            <Image
              source={{ uri: item.senderPhoto }}
              className="size-10 rounded-full"
            />
          )}
          <View
            className={` max-w-[80%] p-3 gap-2 rounded-2xl  ${
              isSender
                ? "rounded-tr-none bg-primary-300"
                : "rounded-tl-none bg-gray-100"
            }`}
          >
            {!isSender && (
              <Text
                className={`font-plus-jakarta-bold ${isSender ? "color-white" : "color-black"}`}
                style={{ color: senderColor }}
              >
                {item.senderName}
              </Text>
            )}

            {replyTarget && (
              <View
                className={`p-2 rounded-lg  ${isSender ? " bg-accent-100" : " bg-accent-100"}`}
                style={{ borderLeftColor: replyColor, borderLeftWidth: 3 }}
              >
                <Text
                  className="text-xs font-plus-jakarta-semibold text-gray-500"
                  style={{ color: replyColor }}
                >
                  Replying to {replyTarget.senderName || "message"}
                </Text>
                <Text
                  className={`text-xs font-plus-jakarta-regular ${isSender ? "text-slate-100" : "text-gray-600"} mt-1`}
                  numberOfLines={2}
                >
                  {replyTarget.content}
                </Text>
              </View>
            )}

            <Text
              className={`font-plus-jakarta-regular ${isSender ? "color-white" : "color-black"}`}
            >
              {item.content}
            </Text>

            <Text
              className={`font-plus-jakarta-regular text-[10px] text-right ${isSender ? "color-gray-50" : "color-black"}`}
            >
              {new Date(item.$createdAt!).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </View>
      </Swipeable>
    );
  }
);
