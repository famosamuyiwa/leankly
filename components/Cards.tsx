import { appwriteConfig, client, db } from "@/config/appwrite";
import images from "@/constants/images";
import { Leank, LeankRequest, Message } from "@/interfaces";
import { formatDate, timeElapsed } from "@/lib/utils";
import { Entypo, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { cssInterop } from "nativewind";
import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Query } from "react-native-appwrite";
import CustomButton from "./Button";

interface LeankProps {
  item: Leank;
  onPress?: () => void;
}

export const LeankCard = ({ item, onPress }: LeankProps) => {
  // Interop the Image component to recognize the 'className' prop
  cssInterop(Image, {
    className: { target: "style" },
  });

  return (
    <TouchableOpacity
      className="flex-1 w-full mt-4 rounded-3xl bg-black  shadow-black-100/70 "
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View className="flex-row justify-between px-4 py-2">
        <Text className="text-white font-plus-jakarta-bold text-xs">
          {item.title}
        </Text>
        {/* <Lottie
          source={require("@/assets/animations/searching.json")}
          loop={true}
          autoPlay={true}
          style={{
            width: 20,
            height: 20,
          }}
        /> */}
      </View>

      <View className="bg-gray-100 flex-row py-4 items-center rounded-b-3xl px-4 gap-2">
        <Image source={{ uri: item.cover }} className="size-20 rounded-lg" />
        <View className="flex-1  gap-2">
          <View className="flex-row justify-between">
            <MaterialCommunityIcons
              name="clock-time-three"
              size={16}
              color="black"
            />

            <Text className=" font-plus-jakarta-regular">
              {formatDate(item.date)}. {item.time}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Entypo name="location" size={16} color="black" />
            <Text className=" font-plus-jakarta-regular ">{item.location}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const LeankCardBig = ({ item, onPress }: LeankProps) => {
  // Interop the Image component to recognize the 'className' prop
  cssInterop(Image, {
    className: { target: "style" },
  });

  return (
    <View className="rounded-3xl bg-white mb-5 shadow-md shadow-slate-200 gap-5 flex-1">
      <Image
        source={images.leankCover}
        className="h-[40%] rounded-t-3xl"
        contentFit="cover"
      />
      <View className="gap-5 px-5">
        <View className="flex-row gap-5 ">
          <Image
            source={{ uri: item.owner?.avatar }}
            className="size-20 rounded-full"
          />
          <View className="gap-2 justify-center">
            <Text className="font-plus-jakarta-bold text-lg">{item.title}</Text>
            <Text className="font-plus-jakarta-regular color-gray-400">
              {item.owner?.name}, {item.owner?.age}
            </Text>
          </View>
        </View>
        <Text className=" font-plus-jakarta-semibold color-gray-400">
          {item.description}
        </Text>
        <View className="flex-row items-center gap-3">
          <Ionicons name="calendar-clear" size={16} />
          <Text className=" font-plus-jakarta-bold">
            {formatDate(item.date)}
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <MaterialCommunityIcons
            name="clock-time-three"
            size={16}
            color="black"
          />

          <Text className=" font-plus-jakarta-bold">{item.time}</Text>
        </View>

        <View className="flex-row items-center gap-3">
          <Entypo name="location" size={16} color="black" />
          <Text className=" font-plus-jakarta-bold">{item.location}</Text>
        </View>
      </View>
    </View>
  );
};

export const RequestCard = ({
  onDeclinePress,
  onAcceptPress,
  item,
}: {
  onDeclinePress: () => void;
  onAcceptPress: () => void;
  item: LeankRequest;
}) => {
  return (
    <View>
      <View className="flex-row gap-5 mb-5">
        <Image
          source={{ uri: item.user?.avatar }}
          className="size-20 rounded-full"
        />
        <View className="gap-2 justify-center flex-1">
          <View className="flex-row items-baseline justify-between">
            <Text className="font-plus-jakarta-bold text-lg">
              {item.user?.name}, {item.user?.age}
            </Text>
            <Text className="font-plus-jakarta-regular text-sm text-gray-400">
              {timeElapsed(item.$createdAt)}
            </Text>
          </View>

          <Text className="font-plus-jakarta-regular color-gray-400 line-clamp-1 ">
            Wants to join{" "}
            <Text className="font-plus-jakarta-semibold color-black">
              {" "}
              {item.leank.title}{" "}
            </Text>
          </Text>
        </View>
      </View>
      <View className="flex-row justify-between">
        <View className="w-[47.5%]">
          <CustomButton
            label="Decline"
            onPress={onDeclinePress}
            textClassName="color-black"
            bgClassName="bg-gray-100"
          />
        </View>
        <View className="w-[47.5%]">
          <CustomButton label="Accept" onPress={onAcceptPress} />
        </View>
      </View>
    </View>
  );
};

export const ChatCard = ({
  item,
  userId,
  onPress,
}: {
  item: Leank;
  userId?: string;
  onPress: () => void;
}) => {
  const [lastMessage, setLastMessage] = useState<Message | null>(
    item.lastMessage ?? null
  );
  const isUserLastMessage = lastMessage?.senderId === userId;

  useEffect(() => {
    const channel = `databases.${appwriteConfig.db}.tables.${appwriteConfig.tables.leanks}.rows.${item.$id}`;
    const unsubscribe = client.subscribe(channel, (res) => {
      if (res.events.includes("databases.*.tables.*.rows.*.update")) {
        getLastMessage();
      }
    });

    return () => unsubscribe();
  }, []);

  const getLastMessage = async () => {
    try {
      const data = await db.getRow({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.leanks,
        rowId: item.$id as string,
        queries: [Query.select(["lastMessage.*"])],
      });

      setLastMessage(data as unknown as Message);
      console.log("lastMessage: ", data);
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      className="flex-row gap-5 mb-5"
    >
      <Image source={{ uri: item.cover }} className="size-20 rounded-2xl" />
      <View className="gap-2 justify-center flex-1">
        {!isUserLastMessage && lastMessage && (
          <View className="bg-secondary-300 size-2 rounded-full absolute top-0 right-2" />
        )}

        <View className="flex-row items-baseline justify-between">
          <Text className="font-plus-jakarta-bold text-lg">{item.title}</Text>
          <Text className="font-plus-jakarta-regular text-sm text-gray-400">
            {timeElapsed(
              lastMessage ? lastMessage.$updatedAt : item.$createdAt
            )}
          </Text>
        </View>

        <Text
          className={` ${!isUserLastMessage && lastMessage ? "font-plus-jakarta-semibold color-black" : "font-plus-jakarta-regular color-gray-400"} line-clamp-1 `}
        >
          {lastMessage
            ? isUserLastMessage
              ? `You:  ${lastMessage.content}`
              : `${lastMessage.senderName}: ${lastMessage.content}`
            : `Start planning to leank...⛓️‍💥`}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
