import { HeaderStyles } from "@/constants/common";
import { Stack } from "expo-router";
import React from "react";

function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Profile",
          headerTitleStyle: HeaderStyles.headerTitleStyle,
          headerTitleAlign: "center",

          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="(settings)"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default ProfileLayout;
