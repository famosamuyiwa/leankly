import { appwriteConfig, client, db } from "@/config/appwrite";
import { Colors } from "@/constants/common";
import { Leank, Message } from "@/interfaces";
import { useUser } from "@clerk/clerk-expo";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { LegendList } from "@legendapp/list";
import { useHeaderHeight } from "@react-navigation/elements";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { cssInterop } from "nativewind";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ID, Query } from "react-native-appwrite";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Chat() {
  // Interop the Image component to recognize the 'className' prop
  cssInterop(Image, {
    className: { target: "style" },
  });
  const insets = useSafeAreaInsets();

  const { chat: chatId } = useLocalSearchParams();
  const { user } = useUser();

  const [messages, setMessages] = useState<Message[]>([]);
  const [leank, setLeank] = useState<Leank>();
  const [messageContent, setMessageContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const headerHeight = Platform.OS === "ios" ? useHeaderHeight() : 0;

  useEffect(() => {
    handleFirstLoad();
  }, []);

  useEffect(() => {
    const channel = `databases.${appwriteConfig.db}.tables.${appwriteConfig.tables.leanks}.rows.${chatId}`;
    const unsubscribe = client.subscribe(channel, () => {
      getMessages();
    });

    return () => unsubscribe();
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
      });

      setLeank(data as unknown as Leank);
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
          Query.limit(100),
          Query.orderAsc("$createdAt"),
        ],
      });

      setMessages(rows as unknown as Message[]);
    } catch (e) {
      console.log(e);
    }
  };

  const sendMessage = async () => {
    if (messageContent.trim() === "") return;

    try {
      const message = {
        content: messageContent,
        senderId: user?.id,
        senderName: user?.fullName,
        senderPhoto: user?.imageUrl,
        leankId: chatId,
      };

      await db.createRow({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.messages,
        rowId: ID.unique(),
        data: message,
      });

      setMessageContent("");

      await db.updateRow({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.leanks,
        rowId: chatId as string,
        data: {
          $updatedAt: new Date().toISOString(),
        },
      });
    } catch (e) {
      console.log(e);
    }
  };

  const memoizedCover = useMemo(
    () => (
      <Image source={{ uri: leank?.cover }} className="size-14 rounded-full" />
    ),
    [leank]
  );

  const renderItem = useCallback(({ item }: { item: Message }) => {
    const isSender = item.senderId === user?.id;
    return (
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
          className={` max-w-[80%] p-3 gap-2 rounded-2xl  ${isSender ? "rounded-tr-none bg-primary-300" : "rounded-tl-none bg-gray-100"}`}
        >
          {!isSender && (
            <Text
              className={`font-plus-jakarta-bold ${isSender ? "color-white" : "color-black"}`}
            >
              {item.senderName}
            </Text>
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
    );
  }, []);

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
    <Animated.View
      layout={LinearTransition}
      entering={FadeIn.duration(400)}
      className="flex-1 px-5  bg-white"
      style={{ paddingTop: insets.top }}
    >
      <View className="gap-5 border-b-[0.4px] border-gray-200 flex-row py-2 items-center">
        <TouchableOpacity activeOpacity={0.6} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={30} />
        </TouchableOpacity>
        {memoizedCover}
        <View>
          <Text className="font-plus-jakarta-bold text-lg">{leank?.title}</Text>
          <Text className="font-plus-jakarta-regular color-gray-400 text-sm">
            {leank?.participants?.length}3 leankers
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior="padding"
        keyboardVerticalOffset={headerHeight}
      >
        {messages && (
          <LegendList
            data={messages}
            initialScrollIndex={messages.length > 0 ? messages.length - 1 : 0}
            renderItem={renderItem}
            keyExtractor={(item) => item?.$id ?? "unknown"}
            recycleItems={true}
            estimatedItemSize={100}
            alignItemsAtEnd
            maintainScrollAtEnd
            maintainScrollAtEndThreshold={0.5}
            maintainVisibleContentPosition
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
          />
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
    </Animated.View>
  );
}
