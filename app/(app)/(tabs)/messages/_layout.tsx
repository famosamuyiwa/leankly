import { HeaderStyles } from "@/constants/common";
import MessagesProvider from "@/lib/MessagesContext";
import { Stack } from "expo-router";
import React from "react";

function ProfileLayout() {
  return (
    <MessagesProvider>
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
