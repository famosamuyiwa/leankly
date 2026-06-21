import { Colors } from "@/constants/common";
import { BasicUser, Participants } from "@/interfaces";
import { useChatSettings } from "@/lib/features/messages/useChatSettings";
import { formatDate } from "@/lib/utils";
import { Entypo, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { cssInterop } from "nativewind";
import { useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Interop the Image component to recognize the 'className' prop
cssInterop(Image, {
  className: { target: "style" },
});

export default function Settings() {
  const {
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
  } = useChatSettings();

  const memoizedCover = useMemo(
    () => (
      <Image
        source={{ uri: activeLeank?.cover }}
        className="aspect-square rounded-b-3xl"
      />
    ),
    [activeLeank]
  );

  const leankerItem = (item: Participants, index: number) => (
    <View key={index} className="flex-row justify-between items-center">
      <View className="flex-row items-center gap-5">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() =>
            openLeankerPreview({
              $id: item.user.$id,
              name: item.user.name,
              age: item.user.age as any,
              avatar: item.user.avatar,
            } as BasicUser)
          }
        >
          <Image
            source={{ uri: item.user.avatar }}
            className="size-14 rounded-full"
          />
        </TouchableOpacity>
        <Text className="font-plus-jakarta-semibold">
          {item.user.$id === currentUserId ? "You" : item.user.name}
        </Text>
      </View>
      {item.user.$id === activeLeank?.owner?.$id ? (
        <Text className="font-plus-jakarta-regular text-gray-400 ">Host</Text>
      ) : (
        currentUserId === activeLeank?.owner?.$id && (
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => handleRemove(item)}
          >
            <Text className="font-plus-jakarta-regular text-red-600">
              Remove
            </Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );

  if (!chatId) {
    return <Text>We could not find this chat room</Text>;
  }

  if (!activeLeank && isLeankLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      bounces={false}
      showsVerticalScrollIndicator={false}
      className="flex-1 pb-10 bg-white"
    >
      <View>
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.9)"]}
          style={styles.overlay}
          start={{ x: 0.5, y: 0 }} // top center
          end={{ x: 0.5, y: 1 }} // bottom center
        />
        <View className=" absolute h-full z-50 p-5 justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex flex-row rounded-full size-11 items-center justify-center bg-white mt-10 shadow-sm shadow-slate-200"
          >
            <Ionicons name="arrow-back" size={20} />
          </TouchableOpacity>
          <View className="gap-2">
            <Text className="font-plus-jakarta-bold text-3xl color-white">
              {activeLeank?.title}
            </Text>
            {activeLeank?.description && (
              <Text className=" font-plus-jakarta-semibold color-gray-200">
                {activeLeank.description}
              </Text>
            )}
          </View>
        </View>

        {memoizedCover}
      </View>

      <View className="flex-row flex-wrap gap-x-5 gap-y-2 px-5 pt-5">
        <View className="flex-row items-center gap-3">
          <View className="flex flex-row items-center justify-center bg-secondary-100 rounded-full size-10">
            <Ionicons name="calendar-clear" size={16} color={Colors.accent} />
          </View>
          <Text className="font-plus-jakarta-bold flex-shrink">
            {activeLeank ? formatDate(activeLeank.date) : "--"}
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
          <Text className="font-plus-jakarta-bold flex-shrink">
            {activeLeank?.time || "--"}
          </Text>
        </View>

        <View className="flex-row items-center gap-3">
          <View className="flex flex-row items-center justify-center bg-secondary-100 rounded-full size-10">
            <Entypo name="location" size={16} color={Colors.accent} />
          </View>
          <Text className="font-plus-jakarta-bold flex-shrink">
            {activeLeank?.location}
          </Text>
        </View>
      </View>

      <View className="p-5 gap-10">
        <View className="gap-3">
          <Text className="font-plus-jakarta-semibold color-gray-400">
            {leankerCount} leankers
          </Text>

          <View className="gap-5">
            {activeLeank?.owner &&
              leankerItem({ user: activeLeank.owner } as Participants, 0)}
            {leankers.map((item, index) => leankerItem(item, index))}
          </View>
        </View>

        {/* Leave */}
        <TouchableOpacity
          onPress={
            currentUserId === activeLeank?.owner?.$id
              ? handleClose
              : handleLeave
          }
          className="bg-red-600 rounded-2xl p-4 shadow-sm"
          activeOpacity={0.6}
        >
          <View className="flex-row items-center justify-center">
            <Ionicons name="log-out-outline" size={20} color="white" />
            <Text className="text-white font-plus-jakarta-semibold text-lg ml-2">
              {currentUserId === activeLeank?.owner?.$id
                ? "Close"
                : "Leave"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0, // full screen
    zIndex: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
});
