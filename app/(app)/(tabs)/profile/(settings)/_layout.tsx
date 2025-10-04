import { HeaderLeft } from "@/components/HeaderUI";
import { HeaderStyles } from "@/constants/common";
import { Stack } from "expo-router";
import React from "react";
import { Text, TouchableOpacity } from "react-native";

function SettingsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Settings",
          headerShadowVisible: false,
          headerTitleStyle: HeaderStyles.headerTitleStyle,
          headerStyle: {
            backgroundColor: "#f3f4f6",
          },
          headerLeft: () => <HeaderLeft />,
        }}
      />
      <Stack.Screen
        name="edit-profile"
        options={{
          title: "Edit Profile",
          headerTitleStyle: HeaderStyles.headerTitleStyle,
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: "#f3f4f6",
          },
          headerLeft: () => <HeaderLeft />,
          headerRight: () => (
            <TouchableOpacity
              activeOpacity={0.6}
              className="bg-black h-12 w-20 rounded-full items-center justify-center"
            >
              <Text className="font-plus-jakarta-semibold color-white">
                Save
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
}

export default SettingsLayout;
