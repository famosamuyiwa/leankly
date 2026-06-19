import { updateArrayRow } from "@/appwrite/actions/leank.actions";
import { appwriteConfig, db } from "@/appwrite/config";
import { Colors } from "@/constants/common";
import { LeankStatus, NavbarOptions } from "@/constants/enums";
import { BasicUser, Leank, Participants } from "@/interfaces";
import { useGlobalContext } from "@/lib/GlobalContext";
import { useMessagesContext } from "@/lib/MessagesContext";
import { formatDate } from "@/lib/utils";
import { Entypo, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { cssInterop } from "nativewind";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ID, Query } from "react-native-appwrite";

// Interop the Image component to recognize the 'className' prop
cssInterop(Image, {
  className: { target: "style" },
});

export default function Settings() {
  const { currentLeank, setCurrentLeank } = useMessagesContext();
  const { currentUser, openUserPreview } = useGlobalContext();
  const { showLoader, hideLoader } = useGlobalContext();
  const currentUserId = currentUser?.$id;
  const params = useLocalSearchParams<{ chat?: string }>();
  const chatId = Array.isArray(params.chat) ? params.chat[0] : params.chat;

  const [leankers, setLeankers] = useState<Participants[]>([]);
  const [participantId, setParticipantId] = useState<string>("");
  const [isLeankLoading, setIsLeankLoading] = useState(true);
  const activeLeank = currentLeank?.$id === chatId ? currentLeank : undefined;

  const memoizedCover = useMemo(
    () => (
      <Image
        source={{ uri: activeLeank?.cover }}
        className="aspect-square rounded-b-3xl"
      />
    ),
    [activeLeank]
  );

  const fetchLeank = useCallback(async () => {
    if (!chatId || activeLeank) return;
    try {
      const data = await db.getRow({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.leanks,
        rowId: chatId,
        queries: [
          Query.select([
            "*",
            "owner.$id",
            "owner.avatar",
            "owner.name",
            "owner.age",
          ]),
        ],
      });

      setCurrentLeank(data as unknown as Leank);
    } catch (e) {
      console.log(e);
    } finally {
      setIsLeankLoading(false);
    }
  }, [activeLeank, chatId, setCurrentLeank]);

  useEffect(() => {
    // Context is only a fast path; route params let settings survive deep links and reloads.
    fetchLeank();
  }, [fetchLeank]);

  useEffect(() => {
    if (!currentUserId || !activeLeank) return;
    let isMounted = true;

    const loadLeankers = async () => {
      try {
        const { rows } = await db.listRows({
          databaseId: appwriteConfig.db,
          tableId: appwriteConfig.tables.participants,
          queries: [
            Query.select([
              "leank.$id",
              "user.$id",
              "user.name",
              "user.avatar",
              "user.age",
            ]),
            Query.equal("leank.$id", activeLeank.$id),
          ],
        });

        if (!isMounted) return;
        const participants = rows as unknown as Participants[];
        setLeankers(participants);
        setParticipantId(
          participants.find((r) => r.user.$id === currentUserId)?.$id || ""
        );
      } catch (e) {
        console.log(e);
      }
    };

    void loadLeankers();

    return () => {
      isMounted = false;
    };
  }, [activeLeank, currentUserId]);

  const createSystemMessage = useCallback(
    async (content: string) => {
      if (!activeLeank) return;
      try {
        await db.createRow({
          databaseId: appwriteConfig.db,
          tableId: appwriteConfig.tables.messages,
          rowId: ID.unique(),
          data: {
            leankId: activeLeank.$id,
            content,
            senderId: "system",
            senderName: "System",
            senderPhoto: "",
          },
        });
      } catch (e) {
        console.log("Failed to create system message", e);
      }
    },
    [activeLeank]
  );

  const exitLeank = useCallback(async () => {
    if (!currentUser || !activeLeank) return;
    showLoader();
    try {
      await updateArrayRow({
        tableId: appwriteConfig.tables.leanks,
        rowId: activeLeank.$id,
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
  }, [
    activeLeank,
    createSystemMessage,
    currentUser,
    hideLoader,
    participantId,
    showLoader,
  ]);

  const closeLeank = useCallback(async () => {
    if (!currentUser || !activeLeank) return;
    showLoader();
    try {
      await db.updateRow({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.leanks,
        rowId: activeLeank.$id,
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
  }, [activeLeank, currentUser, hideLoader, showLoader]);

  const removeUser = useCallback(
    async (leanker: Participants) => {
      if (!currentUser || !activeLeank) return;
      try {
        updateArrayRow({
          tableId: appwriteConfig.tables.leanks,
          rowId: activeLeank.$id,
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
    },
    [activeLeank, createSystemMessage, currentUser]
  );

  const handleLeave = useCallback(() => {
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
  }, [exitLeank]);

  const handleClose = useCallback(() => {
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
  }, [closeLeank]);

  const handleRemove = useCallback((item: Participants) => {
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
  }, [removeUser]);

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
            {Number(leankers.length) + 1} leankers
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
