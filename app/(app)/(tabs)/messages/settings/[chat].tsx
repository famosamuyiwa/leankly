import { user2 } from "@/constants/data";
import { useGlobalContext } from "@/lib/GlobalContext";
import { useMessagesContext } from "@/lib/MessagesContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { cssInterop } from "nativewind";
import { useMemo } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Settings() {
  // Interop the Image component to recognize the 'className' prop
  cssInterop(Image, {
    className: { target: "style" },
  });

  const { currentLeank } = useMessagesContext();
  const { currentUser } = useGlobalContext();

  const memoizedCover = useMemo(
    () => (
      <Image
        source={{ uri: currentLeank?.cover }}
        className="aspect-square rounded-b-3xl"
      />
    ),
    [currentLeank]
  );

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

  const handleRemove = () => {
    Alert.alert(
      "Remove",
      "Are you sure you want to remove --user-- from this leank?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeUser(),
        },
      ]
    );
  };

  const exitLeank = () => {};

  const removeUser = () => {};

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
          <Text className="font-plus-jakarta-bold text-3xl color-white">
            {currentLeank?.title}
          </Text>
        </View>

        {memoizedCover}
      </View>

      <View className="p-5 gap-10">
        <View className="gap-3">
          <Text className="font-plus-jakarta-semibold">3 Leankers</Text>
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center gap-5">
              <Image
                source={{ uri: user2.avatar }}
                className="size-14 rounded-full"
              />
              <Text className="font-plus-jakarta-semibold">{user2.name}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.6} onPress={handleRemove}>
              <Text className="font-plus-jakarta-regular text-red-600">
                Remove
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Leave */}
        <TouchableOpacity
          onPress={handleLeave}
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
