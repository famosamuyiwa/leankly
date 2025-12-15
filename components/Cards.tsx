import { appwriteConfig, client, db } from "@/appwrite/config";
import { Colors } from "@/constants/common";
import { RequestAction } from "@/constants/enums";
import { BasicUser, Leank, LeankRequest, UserChatMeta } from "@/interfaces";
import { usePremium } from "@/lib/PremiumContext";
import { formatDate, timeElapsed } from "@/lib/utils";
import { Entypo, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { cssInterop } from "nativewind";
import React, { useEffect } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { Query } from "react-native-appwrite";
import CustomButton from "./Button";

interface LeankProps {
  item: Leank;
  onPress?: () => void;
}

// Interop the Image component to recognize the 'className' prop
cssInterop(Image, {
  className: { target: "style" },
});

export const LeankCard = ({ item, onPress }: LeankProps) => {
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

export const LeankCardBig = ({
  item,
  onPress,
  onAvatarPress,
}: LeankProps & { onAvatarPress?: (user: BasicUser) => void }) => {
  return (
    <View
      className={`rounded-3xl w-full bg-white mb-5 shadow-md ${Platform.OS === "ios" ? "shadow-slate-200" : "shadow-gray-300 "}  gap-5 flex-1`}
    >
      <Image
        source={{ uri: item.cover }}
        className="h-[35%] rounded-t-3xl"
        contentFit="cover"
      />
      <View className="gap-5 px-5">
        <View className="flex-row gap-5 ">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              onAvatarPress?.({
                $id: item.owner?.$id || item.ownerId,
                name: item.owner?.name,
                age: item.owner?.age,
                avatar: item.owner?.avatar,
                joinedAt: (item.owner as any)?.$createdAt,
              } as BasicUser)
            }
          >
            <Image
              source={{ uri: item.owner?.avatar }}
              className="size-20 rounded-full"
            />
          </TouchableOpacity>
          <View className="gap-2 justify-center w-4/6">
            <Text className="font-plus-jakarta-bold text-lg line-clamp-2">
              {item.title}
            </Text>
            <Text className="font-plus-jakarta-regular color-gray-400">
              {item.owner?.name}, {item.owner?.age}
            </Text>
          </View>
        </View>
        <Text className=" font-plus-jakarta-semibold color-gray-400 line-clamp-3">
          {item.description}
        </Text>
        <View className="flex-row items-center gap-3">
          <View className="flex flex-row items-center justify-center bg-secondary-100 rounded-full size-10">
            <Ionicons name="calendar-clear" color={Colors.accent} />
          </View>
          <Text className=" font-plus-jakarta-bold">
            {formatDate(item.date)}
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <View className="flex flex-row items-center justify-center bg-secondary-100 rounded-full size-10">
            <MaterialCommunityIcons
              name="clock-time-three"
              size={16}
              color={Colors.accent}
            />
          </View>
          <Text className=" font-plus-jakarta-bold">{item.time || "--"}</Text>
        </View>

        <View className="flex-row items-center gap-3">
          <View className="flex flex-row items-center justify-center bg-secondary-100 rounded-full size-10">
            <Entypo name="location" size={16} color={Colors.accent} />
          </View>
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
  meta,
  userId,
  onPress,
  onItemUpdate,
}: {
  item: Leank;
  meta: UserChatMeta | undefined;
  userId?: string;
  onPress: () => void;
  onItemUpdate: (item: Leank, meta: UserChatMeta) => void;
}) => {
  const isUserLastMessage = item.lastMessage?.senderId === userId;
  const lastMessageTs = item.lastMessage?.$createdAt
    ? new Date(item.lastMessage.$createdAt).getTime()
    : 0;
  const readAtTs = meta?.readAt ? new Date(meta.readAt).getTime() : 0;
  const isUnread =
    !!lastMessageTs && !isUserLastMessage && lastMessageTs > readAtTs;

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
    if (!userId) return;
    try {
      const { rows, total } = await db.listRows({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.leanks,
        queries: [
          Query.select([
            "cover",
            "title",
            "lastMessage.senderName",
            "lastMessage.content",
            "lastMessage.senderId",
            "lastMessage.$createdAt",
            "ownerId",
            "participantIds",
            "status",
          ]),
          Query.equal("$id", item.$id),
          Query.or([
            Query.equal("ownerId", userId),
            Query.contains("participantIds", userId),
          ]),
          Query.equal("status", RequestAction.PENDING),
        ],
      });

      const { rows: metaRows, total: metaTotal } = await db.listRows({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.userChatMeta,
        queries: [
          Query.and([
            Query.equal("userId", userId),
            Query.equal("leankId", item.$id),
          ]),
        ],
      });

      //send update back to parent
      onItemUpdate(
        rows[0] as unknown as Leank,
        metaRows[0] as unknown as UserChatMeta
      );
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
      <Image
        source={{ uri: item.cover }}
        className="size-20 rounded-2xl"
        transition={300}
        cachePolicy="memory-disk"
      />
      <View className="gap-2 justify-center flex-1">
        {isUnread && !isUserLastMessage && item.lastMessage && (
          <View className="bg-secondary-300 size-2 rounded-full absolute top-0 right-2" />
        )}

        <View className="flex-row items-baseline justify-between ">
          <Text className="font-plus-jakarta-bold text-lg w-4/6 line-clamp-2">
            {item.title}
          </Text>
          <Text className="font-plus-jakarta-regular text-sm text-gray-400">
            {timeElapsed(
              item.lastMessage ? item.lastMessage.$createdAt : item.$createdAt
            )}
          </Text>
        </View>

        <Text
          className={` ${isUnread && !isUserLastMessage && item.lastMessage ? "font-plus-jakarta-semibold color-black" : "font-plus-jakarta-regular color-gray-400"} line-clamp-1 `}
        >
          {item.lastMessage
            ? isUserLastMessage
              ? `You:  ${item.lastMessage.content}`
              : `${item.lastMessage.senderName}: ${item.lastMessage.content}`
            : `Start planning to leank...⛓️‍💥`}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// A blurred/locked placeholder shaped like RequestCard
export const LockedRequestPlaceholder = () => {
  const { isPro, openPaywall } = usePremium();

  return (
    <TouchableOpacity onPress={() => openPaywall("See all requests")}>
      <View className="flex-row gap-5 mb-5 items-center opacity-60">
        <View className="size-20 rounded-full bg-gray-200" />
        <View className="gap-3 justify-center flex-1">
          <View className="flex-row items-baseline justify-between">
            <View className="h-4 bg-gray-200 rounded w-1/3" />
            <View className="h-3 bg-gray-200 rounded w-10" />
          </View>
          <View className="h-4 bg-gray-200 rounded w-2/3" />
        </View>
      </View>
      <View className="flex-row justify-between opacity-60">
        <View className="w-[47.5%] h-12 bg-gray-200 rounded-2xl" />
        <View className="w-[47.5%] h-12 bg-gray-200 rounded-2xl" />
      </View>
      <View className="absolute inset-0 items-center justify-center">
        <View className="bg-white/80 px-4 py-2 rounded-2xl border border-gray-200 flex-row items-center gap-2">
          <MaterialCommunityIcons
            name="crown"
            size={16}
            color={Colors.accent}
          />
          <Text className="font-plus-jakarta-semibold text-gray-700">
            Unlock all requests
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
