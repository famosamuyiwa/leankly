import images from "@/constants/images";
import { Fontisto } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { cssInterop } from "nativewind";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

export default function Profile() {
  // Interop the Image component to recognize the 'className' prop
  cssInterop(Image, {
    className: { target: "style" },
  });

  return (
    <View className="flex flex-1 bg-white px-5">
      <View>
        {/* User Info */}
        <View className="gap-4">
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => router.navigate("/(app)/(tabs)/profile/(settings)")}
          >
            <Fontisto
              name="player-settings"
              className="absolute self-end pt-10"
              size={30}
            />
          </TouchableOpacity>
          <Image
            source={images.avatarPlaceholder}
            className="w-20 h-20 rounded-full"
            contentFit="contain"
          />
          <Text>Ayomide Balogun</Text>
          <View className="flex-row gap-5">
            <Text className="color-gray-400">
              <Text className="color-black font-plus-jakarta-bold">3</Text>{" "}
              Hosted
            </Text>
            <Text className="color-gray-400">
              <Text className="color-black font-plus-jakarta-bold">1</Text>{" "}
              Attended
            </Text>
          </View>
        </View>

        {/* Recent Activities */}
        <View></View>
      </View>
    </View>
  );
}
