import { BadgeStyle, Colors, HeaderStyles } from "@/constants/common";
import FiltersProvider from "@/lib/FiltersContext";
import { useGlobalContext } from "@/lib/GlobalContext";
import { ProfileProvider } from "@/lib/ProfileContext";
import { Entypo, FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { PortalProvider } from "@gorhom/portal";
import { Tabs } from "expo-router";
import React from "react";

export default function TabLayout() {
  const { unreadCount } = useGlobalContext();

  return (
    <FiltersProvider>
      <ProfileProvider>
        <PortalProvider>
          <Tabs
            screenOptions={{
              tabBarActiveTintColor: Colors.primary,
            }}
          >
            <Tabs.Screen
              name="index"
              options={{
                title: "Home",
                headerShown: false,
                tabBarIcon: ({ color, size }) => (
                  <Entypo name="home" color={color} size={size} />
                ),
              }}
            />
            <Tabs.Screen
              name="create"
              options={{
                title: "Create",
                headerTitleAlign: "center",
                headerShadowVisible: false,
                headerTitleStyle: HeaderStyles.headerTitleStyle,
                tabBarIcon: ({ color, size }) => (
                  <MaterialIcons name="add-circle" color={color} size={size} />
                ),
              }}
            />
            <Tabs.Screen
              name="messages"
              options={{
                title: "Messages",
                headerShown: false,
                tabBarIcon: ({ color, size }) => (
                  <Entypo name="chat" color={color} size={size} />
                ),
                tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
                tabBarBadgeStyle: BadgeStyle,
              }}
            />
            <Tabs.Screen
              name="profile"
              options={{
                title: "Profile",
                headerShown: false,

                headerTitleStyle: HeaderStyles.headerTitleStyle,
                tabBarIcon: ({ color, size }) => (
                  <FontAwesome name="user" color={color} size={size} />
                ),
              }}
            />
          </Tabs>
        </PortalProvider>
      </ProfileProvider>
    </FiltersProvider>
  );
}
