import { Colors } from "@/constants/common";
import { BasicUser, Message } from "@/interfaces";
import {
  ChatListItem,
  ReplySwipeHandle,
  getUserColor,
  isRealMessage,
  isSameChatSender,
  isSystemMessage,
} from "@/lib/features/messages/chatItems";
import { useChatScreen } from "@/lib/features/messages/useChatScreen";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { LegendList } from "@legendapp/list";
import { useHeaderHeight } from "expo-router/react-navigation";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { cssInterop } from "nativewind";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Reanimated, {
  Extrapolation,
  FadeIn,
  interpolate,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Interop the Image component to recognize the 'className' prop
cssInterop(Image, {
  className: { target: "style" },
});

export default function Chat() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const {
    chatId,
    currentLeank,
    currentUser,
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
  } = useChatScreen();

  const memoizedCover = useMemo(
    () => (
      <Image
        source={{ uri: currentLeank?.cover }}
        className="size-14 rounded-full"
      />
    ),
    [currentLeank],
  );

  const renderItem = ({
    item,
    index,
  }: {
    item: ChatListItem;
    index: number;
  }) => {
    const previousMessage = messages[index - 1];
    const nextMessage = messages[index + 1];
    const startsSenderGroup = !isSameChatSender(previousMessage, item);
    const endsSenderGroup = !isSameChatSender(nextMessage, item);
    const compactWithNext = !endsSenderGroup;

    return (
      <MessageBubble
        item={item}
        currentUserId={currentUser?.id}
        showSenderName={startsSenderGroup}
        showAvatar={endsSenderGroup}
        compactWithNext={compactWithNext}
        onReplySelect={(msg) => setReplyTo(msg)}
        openSwipeRef={openSwipeRef}
        onUserPress={(user) =>
          openUserPreview({
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            age: user.age,
          })
        }
      />
    );
  };

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
          onPress={openSettings}
          className="flex-row gap-5 items-center flex-1"
        >
          {memoizedCover}
          <View className="w-4/6">
            <Text className="font-plus-jakarta-bold text-lg line-clamp-2">
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
            keyExtractor={(item) => item?.id ?? "unknown"}
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
                {replyTo.senderId === currentUser?.id
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

type MessageBubbleProps = {
  item: ChatListItem;
  currentUserId?: string;
  showSenderName: boolean;
  showAvatar: boolean;
  compactWithNext: boolean;
  onReplySelect: (msg: Message) => void;
  openSwipeRef: React.MutableRefObject<ReplySwipeHandle | null>;
  onUserPress?: (user: BasicUser) => void;
};

const REPLY_SWIPE_TRIGGER = 56;
const REPLY_SWIPE_MAX = 76;
const REPLY_SWIPE_EDGE_GUTTER = 36;
const REPLY_SWIPE_SPRING = {
  damping: 18,
  stiffness: 260,
  mass: 0.6,
};

const MessageBubble = React.memo(
  ({
    item,
    currentUserId,
    showSenderName,
    showAvatar,
    compactWithNext,
    onReplySelect,
    openSwipeRef,
    onUserPress,
  }: MessageBubbleProps) => {
    const isSystem = isSystemMessage(item);
    const isSender = item.senderId === currentUserId;
    const replyTarget =
      isRealMessage(item) && item.replyToId
        ? {
            messageId: item.replyToId,
            senderName: item.replyToSender,
            content: item.replyToContent,
          }
        : null;
    const senderColor = getUserColor(item.senderId);
    const replyColor = getUserColor(replyTarget?.senderName);
    const translateX = useSharedValue(0);

    const closeSwipe = React.useCallback(() => {
      // eslint-disable-next-line react-hooks/immutability
      translateX.value = withSpring(0, REPLY_SWIPE_SPRING);
    }, [translateX]);

    const swipeHandle = React.useMemo<ReplySwipeHandle>(
      () => ({
        close: closeSwipe,
      }),
      [closeSwipe],
    );

    const handleReplySelect = React.useCallback(() => {
      if (!isRealMessage(item)) return;

      const openSwipe = openSwipeRef.current;
      if (openSwipe && openSwipe !== swipeHandle) {
        openSwipe.close();
      }
      openSwipeRef.current = swipeHandle;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onReplySelect(item);
      closeSwipe();
    }, [closeSwipe, item, onReplySelect, openSwipeRef, swipeHandle]);

    /* eslint-disable react-hooks/immutability, react-hooks/refs */
    const panGesture = React.useMemo(
      () =>
        Gesture.Pan()
          .hitSlop({ left: -REPLY_SWIPE_EDGE_GUTTER })
          .activeOffsetX([-10, 10])
          .failOffsetY([-10, 10])
          .onUpdate((event) => {
            translateX.value = Math.min(
              Math.max(event.translationX, 0),
              REPLY_SWIPE_MAX,
            );
          })
          .onEnd(() => {
            const shouldReply = translateX.value >= REPLY_SWIPE_TRIGGER;
            translateX.value = withSpring(0, REPLY_SWIPE_SPRING);
            if (shouldReply) {
              runOnJS(handleReplySelect)();
            }
          })
          .onFinalize(() => {
            translateX.value = withSpring(0, REPLY_SWIPE_SPRING);
          }),
      [handleReplySelect, translateX],
    );
    /* eslint-enable react-hooks/immutability, react-hooks/refs */

    const bubbleAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translateX.value }],
    }));

    const actionAnimatedStyle = useAnimatedStyle(() => {
      const scale = interpolate(
        translateX.value,
        [0, REPLY_SWIPE_TRIGGER, REPLY_SWIPE_MAX],
        [0.55, 0.95, 1.08],
        Extrapolation.CLAMP,
      );
      const opacity = interpolate(
        translateX.value,
        [0, 14, REPLY_SWIPE_TRIGGER],
        [0, 0.65, 1],
        Extrapolation.CLAMP,
      );

      return {
        opacity,
        transform: [{ scale }],
      };
    });

    if (isSystem) {
      return (
        <View className="w-full items-center mb-5 px-5">
          <Text className="text-gray-500 text-xs font-plus-jakarta-regular text-center">
            {item.content}
          </Text>
        </View>
      );
    }
    const messageCreatedAt = isRealMessage(item) ? item.createdAt : undefined;

    return (
      <View className="relative">
        <Reanimated.View
          pointerEvents="none"
          className="absolute left-0 top-0 h-full justify-center px-4"
          style={actionAnimatedStyle}
        >
          <Ionicons
            name="return-up-back-outline"
            size={20}
            color={Colors.primary}
          />
        </Reanimated.View>
        <GestureDetector gesture={panGesture}>
          <View
            className={`w-full flex-row gap-2 ${compactWithNext ? "mb-1" : "mb-5"} ${isSender ? "justify-end" : "justify-start"}`}
          >
            {!isSender && showAvatar && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  if (!item.senderId) return;
                  onUserPress?.({
                    id: item.senderId,
                    name: item.senderName,
                    avatar: item.senderPhoto || undefined,
                  });
                }}
              >
                <Image
                  source={{ uri: item.senderPhoto || undefined }}
                  className="size-10 rounded-full"
                />
              </TouchableOpacity>
            )}
            {!isSender && !showAvatar && (
              <View pointerEvents="none" className="size-10" />
            )}
            <Reanimated.View
              style={bubbleAnimatedStyle}
              className={` max-w-[80%] p-3 gap-2 rounded-2xl  ${
                isSender
                  ? `${showAvatar ? "rounded-tr-none" : ""} bg-primary-300`
                  : `${showAvatar ? "rounded-tl-none" : ""} bg-gray-100`
              }`}
            >
              {!isSender && showSenderName && (
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
                {messageCreatedAt
                  ? new Date(messageCreatedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </Text>
            </Reanimated.View>
          </View>
        </GestureDetector>
      </View>
    );
  },
);

MessageBubble.displayName = "MessageBubble";
