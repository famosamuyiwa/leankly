import { Colors } from "@/constants/common";
import images from "@/constants/images";
import { BasicUser, Leank, LeankRequest, UserChatMeta } from "@/interfaces";
import { usePremium } from "@/lib/PremiumContext";
import { formatDate, timeElapsed } from "@/lib/utils";
import { Entypo, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
  onAvatarPress,
}: LeankProps & { onAvatarPress?: (user: BasicUser) => void }) => {
  const ownerId = item.owner?.$id || item.ownerId;
  const coverSource = item.cover ? { uri: item.cover } : images.leankCover;
  const avatarSource = item.owner?.avatar
    ? { uri: item.owner.avatar }
    : images.avatarPlaceholder;
  const title = item.title?.trim() || "Untitled leank";
  const location = item.location?.trim() || "Location TBD";
  const dateLabel = item.date ? formatDate(item.date) : "Date TBD";
  const timeLabel = item.time?.trim() || "Time TBD";
  const hostLabel = [item.owner?.name, item.owner?.age]
    .filter(Boolean)
    .join(", ");

  return (
    <View
      className={`rounded-3xl w-full bg-white mb-5 shadow-md ${Platform.OS === "ios" ? "shadow-slate-200" : "shadow-gray-300 "}  flex-1`}
    >
      <View className="h-[58%] rounded-t-3xl overflow-hidden">
        <Image
          source={coverSource}
          className="absolute h-full w-full"
          contentFit="cover"
          transition={250}
          cachePolicy="memory-disk"
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.03)", "rgba(0,0,0,0.38)", "rgba(0,0,0,0.86)"]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View className="absolute left-4 right-4 top-4 flex-row items-center justify-end">
          {!!item.category && (
            <View className="max-w-[70%] rounded-full bg-black/40 px-3 py-2">
              <Text className="font-plus-jakarta-bold text-xs text-white line-clamp-1">
                {item.category}
              </Text>
            </View>
          )}
        </View>

        <View className="absolute bottom-4 left-4 right-4 gap-4">
          <View className="flex-row items-end gap-3">
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={!ownerId}
              onPress={() => {
                if (!ownerId) return;
                onAvatarPress?.({
                  $id: ownerId,
                  name: item.owner?.name,
                  age: item.owner?.age,
                  avatar: item.owner?.avatar,
                  joinedAt: (item.owner as any)?.$createdAt,
                } as BasicUser);
              }}
              className="rounded-full border-2 border-white"
            >
              <Image
                source={avatarSource}
                className="size-14 rounded-full"
                contentFit="cover"
              />
            </TouchableOpacity>

            <View className="flex-1 pb-1">
              <Text className="font-plus-jakarta-extrabold text-2xl leading-8 text-white line-clamp-2">
                {title}
              </Text>
              <Text className="font-plus-jakarta-semibold text-sm text-white/80 line-clamp-1">
                Hosted by {hostLabel || "a Leankly host"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className="flex-1 justify-between px-4 py-4">
        <View className="gap-3">
          <View className="flex-row gap-3">
            <View className="flex-1 rounded-2xl bg-primary-100 px-3 py-3">
              <View className="mb-2 flex-row items-center gap-2">
                <Ionicons
                  name="calendar-clear"
                  size={15}
                  color={Colors.primary}
                />
              </View>
              <Text className="font-plus-jakarta-extrabold text-sm text-black-300 line-clamp-1">
                {dateLabel}
              </Text>
              <Text className="font-plus-jakarta-semibold text-xs text-black-100 line-clamp-1">
                {timeLabel}
              </Text>
            </View>

            <View className="flex-1 rounded-2xl bg-secondary-100 px-3 py-3">
              <View className="mb-2 flex-row items-center gap-2">
                <MaterialCommunityIcons
                  name="account-group"
                  size={16}
                  color={Colors.accent}
                />
              </View>
              <Text className="font-plus-jakarta-extrabold text-sm text-black-300">
                {item.peopleRequired || 1} needed
              </Text>
              <Text className="font-plus-jakarta-semibold text-xs text-black-100">
                Small group
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-3 rounded-2xl bg-gray-50 px-3 py-3">
            <View className="items-center justify-center rounded-full bg-secondary-200 size-9">
              <Entypo name="location" size={16} color={Colors.accent} />
            </View>
            <Text className="flex-1 font-plus-jakarta-bold text-sm text-black-300 line-clamp-2">
              {location}
            </Text>
          </View>
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
              {timeElapsed(item.$createdAt || "")}
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
}: {
  item: Leank;
  meta: UserChatMeta | undefined;
  userId?: string;
  onPress: () => void;
}) => {
  const isUserLastMessage = item.lastMessage?.senderId === userId;
  const lastMessageTs = item.lastMessage?.$createdAt
    ? new Date(item.lastMessage.$createdAt).getTime()
    : 0;
  const readAtTs = meta?.readAt ? new Date(meta.readAt).getTime() : 0;
  const isUnread =
    !!lastMessageTs && !isUserLastMessage && lastMessageTs > readAtTs;

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
              item.lastMessage
                ? item.lastMessage.$createdAt || ""
                : item.$createdAt || "",
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
  const { openPaywall } = usePremium();

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
