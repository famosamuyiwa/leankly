import { HeaderStyles } from "@/constants/common";
import { ProfileProvider } from "@/lib/ProfileContext";
import { Stack } from "expo-router";
import React from "react";

function ProfileLayout() {
  return (
    <ProfileProvider>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            title: "Messages",
            headerTitleStyle: HeaderStyles.headerTitleStyle,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="[chat]"
          options={{
            title: "Chat",
            headerTitleStyle: HeaderStyles.headerTitleStyle,
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </ProfileProvider>
  );
}

export default ProfileLayout;
