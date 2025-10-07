import { appwriteConfig, client, db } from "@/config/appwrite";
import { Colors } from "@/constants/common";
import { Leank, Message } from "@/interfaces";
import { useUser } from "@clerk/clerk-expo";
import { FontAwesome } from "@expo/vector-icons";
import { LegendList } from "@legendapp/list";
import { useHeaderHeight } from "@react-navigation/elements";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { cssInterop } from "nativewind";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { ID, Query } from "react-native-appwrite";

export default function Chat() {
  // Interop the Image component to recognize the 'className' prop
  cssInterop(Image, {
    className: { target: "style" },
  });

  const { chat: chatId } = useLocalSearchParams();
  const { user } = useUser();

  if (!chatId) {
    return <Text>We could not find this chat room</Text>;
  }

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
      await getMessages();
      await getLeank();
    } catch (e) {
      console.log(e);
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
          Query.equal("chatroomId", chatId),
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
        chatroomId: chatId,
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

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator />
      </View>
    );
  }

  const renderItem = ({ item }: { item: Message }) => {
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
  };

  return (
    <>
      <Stack.Screen options={{ title: leank?.title }} />
      <View className="flex-1 px-5  bg-white">
        <KeyboardAvoidingView
          className="flex-1"
          behavior="padding"
          keyboardVerticalOffset={headerHeight}
        >
          <LegendList
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item?.$id ?? "unknown"}
            recycleItems={true}
            estimatedItemSize={100}
            contentContainerStyle={{ paddingVertical: 10 }}
            initialScrollIndex={messages.length - 1}
            alignItemsAtEnd
            maintainScrollAtEnd
            maintainScrollAtEndThreshold={0.5}
            maintainVisibleContentPosition
            showsVerticalScrollIndicator={false}
          />

          <View className="border-[1px] border-gray-200 bg-gray-100 rounded-full flex-row items-center gap-2 p-2 mb-2 ">
            <TextInput
              placeholder="Message..."
              value={messageContent}
              onChangeText={setMessageContent}
              className="min-h-10 flex-1 p-2 flex-shrink-1"
              numberOfLines={2}
              multiline
              placeholderTextColor={"#9ca3af"}
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
      </View>
    </>
  );
}
