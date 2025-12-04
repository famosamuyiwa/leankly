import { updateArrayRow } from "@/appwrite/actions/leank.actions";
import { appwriteConfig, db } from "@/appwrite/config";
import { Colors } from "@/constants/common";
import { LeankStatus, NavbarOptions } from "@/constants/enums";
import { BasicUser, Participants } from "@/interfaces";
import { useGlobalContext } from "@/lib/GlobalContext";
import { useMessagesContext } from "@/lib/MessagesContext";
import { formatDate } from "@/lib/utils";
import { Entypo, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { cssInterop } from "nativewind";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Query } from "react-native-appwrite";

export default function Settings() {
  // Interop the Image component to recognize the 'className' prop
  cssInterop(Image, {
    className: { target: "style" },
  });

  const { currentLeank } = useMessagesContext();
  const { currentUser, openUserPreview } = useGlobalContext();
  const { showLoader, hideLoader } = useGlobalContext();

  const [leankers, setLeankers] = useState<Participants[]>([]);
  const [participantId, setParticipantId] = useState<string>("");

  const memoizedCover = useMemo(
    () => (
      <Image
        source={{ uri: currentLeank?.cover }}
        className="aspect-square rounded-b-3xl"
      />
    ),
    [currentLeank]
  );

  useEffect(() => {
    fetchLeankers();
  }, []);

  const fetchLeankers = async () => {
    if (!currentUser || !currentLeank) return;
    try {
      const { rows, total } = await db.listRows({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.participants,
        queries: [
          Query.select(["leank.$id", "user.$id", "user.name", "user.avatar"]),
          Query.equal("leank.$id", currentLeank.$id),
        ],
      });

      setLeankers(rows as unknown as Participants[]);
      setParticipantId(
        rows.filter((r) => r.user.$id === currentUser?.$id).map((r) => r.$id)[0]
      );
    } catch (e) {
      console.log(e);
    }
  };

  const handleLeave = () => {
    Alert.alert("Leave", "Are you sure you want to leave this leank?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => exitLeank(),
      },
    ]);
  };

  const handleClose = () => {
    Alert.alert("Close", "Are you sure you want to close this leank?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Close",
        style: "destructive",
        onPress: () => closeLeank(),
      },
    ]);
  };

  const handleRemove = (item: Participants) => {
    Alert.alert(
      "Remove",
      `Are you sure you want to remove ${item.user.name} from this leank?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeUser(item),
        },
      ]
    );
  };

  const exitLeank = async () => {
    if (!currentUser || !currentLeank) return;
    showLoader();
    try {
      await updateArrayRow({
        tableId: appwriteConfig.tables.leanks,
        rowId: currentLeank.$id,
        field: "participantIds",
        values: [currentUser.$id],
        action: "remove",
      });

      await db.deleteRow({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.participants,
        rowId: participantId,
      });
      await createSystemMessage(`${currentUser.name} left the leank`);
    } catch (e) {
      console.error(e);
    } finally {
      router.dismissTo({
        pathname: "/messages",
        params: {
          nav: NavbarOptions.CHATS,
        },
      });
      hideLoader();
    }
  };

  const closeLeank = async () => {
    if (!currentUser || !currentLeank) return;
    showLoader();
    try {
      await db.updateRow({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.leanks,
        rowId: currentLeank.$id,
        data: {
          status: LeankStatus.COMPLETED,
        },
      });
    } catch (e) {
      console.error(e);
    } finally {
      router.dismissTo({
        pathname: "/messages",
        params: {
          nav: NavbarOptions.CHATS,
        },
      });
      hideLoader();
    }
  };

  const removeUser = async (leanker: Participants) => {
    if (!currentUser || !currentLeank) return;
    try {
      updateArrayRow({
        tableId: appwriteConfig.tables.leanks,
        rowId: currentLeank.$id,
        field: "participantIds",
        values: [leanker.user.$id],
        action: "remove",
      });

      db.deleteRow({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.participants,
        rowId: leanker.$id,
      });
      await createSystemMessage(
        `${leanker.user.name} was removed from the chat`
      );

      setLeankers((prev) => prev.filter((l) => l.$id !== leanker.$id));
    } catch (e) {
      console.error(e);
    }
  };

  const createSystemMessage = async (content: string) => {
    try {
      await db.createRow({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.messages,
        rowId: require("react-native-appwrite").ID.unique(),
        data: {
          leankId: currentLeank?.$id,
          content,
          senderId: "system",
          senderName: "System",
          senderPhoto: "",
        },
      });
    } catch (e) {
      console.log("Failed to create system message", e);
    }
  };

  const leankerItem = (item: Participants, index: number) => (
    <View key={index} className="flex-row justify-between items-center">
      <View className="flex-row items-center gap-5">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() =>
            openUserPreview({
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
          {item.user.$id === currentUser?.$id ? "You" : item.user.name}
        </Text>
      </View>
      {item.user.$id === currentLeank?.owner?.$id ? (
        <Text className="font-plus-jakarta-regular text-gray-400 ">Host</Text>
      ) : (
        currentUser?.$id === currentLeank?.owner?.$id && (
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
              {currentLeank?.title}
            </Text>
            {currentLeank?.description && (
              <Text className=" font-plus-jakarta-semibold color-gray-200">
                {currentLeank.description}
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
            {currentLeank ? formatDate(currentLeank.date) : "--"}
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
            {currentLeank?.time || "--"}
          </Text>
        </View>

        <View className="flex-row items-center gap-3">
          <View className="flex flex-row items-center justify-center bg-secondary-100 rounded-full size-10">
            <Entypo name="location" size={16} color={Colors.accent} />
          </View>
          <Text className="font-plus-jakarta-bold flex-shrink">
            {currentLeank?.location}
          </Text>
        </View>
      </View>

      <View className="p-5 gap-10">
        <View className="gap-3">
          <Text className="font-plus-jakarta-semibold color-gray-400">
            {Number(leankers.length) + 1} leankers
          </Text>

          <View className="gap-5">
            {currentLeank?.owner &&
              leankerItem({ user: currentLeank.owner } as Participants, 0)}
            {leankers.map((item, index) => leankerItem(item, index))}
          </View>
        </View>

        {/* Leave */}
        <TouchableOpacity
          onPress={
            currentUser?.$id === currentLeank?.owner?.$id
              ? handleClose
              : handleLeave
          }
          className="bg-red-600 rounded-2xl p-4 shadow-sm"
          activeOpacity={0.6}
        >
          <View className="flex-row items-center justify-center">
            <Ionicons name="log-out-outline" size={20} color="white" />
            <Text className="text-white font-plus-jakarta-semibold text-lg ml-2">
              {currentUser?.$id === currentLeank?.owner?.$id
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
