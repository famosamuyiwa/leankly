import { HeaderStyles } from "@/constants/common";
import { useScreenTracker } from "@/hooks/useScreenTracker";
import MessagesProvider from "@/lib/MessagesContext";
import { Stack } from "expo-router";
import React from "react";

function ProfileLayout() {
  useScreenTracker();

  return (
    <MessagesProvider>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            title: "Messages",
            headerTitleStyle: HeaderStyles.headerTitleStyle,
            headerTitleAlign: "center",
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="[chat]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="settings/[chat]"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </MessagesProvider>
  );
}

export default ProfileLayout;
