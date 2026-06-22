import { BadgeStyle, Colors, HeaderStyles } from "@/constants/common";
import { useGlobalContext } from "@/lib/GlobalContext";
import { ProfileProvider } from "@/lib/ProfileContext";
import { Entypo, FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { PortalProvider } from "@gorhom/portal";
import { Tabs } from "expo-router";

export default function TabLayout() {
  const { unreadCount } = useGlobalContext();

  return (
    <ProfileProvider>
      <PortalProvider>
        <Tabs
          detachInactiveScreens={false}
          screenOptions={{
            tabBarActiveTintColor: Colors.primary,
            tabBarInactiveTintColor: "#8B95A7",
            tabBarStyle: {
              backgroundColor: Colors.secondary,
              borderTopWidth: 0,
              height: 96,
              paddingTop: 8,
              paddingBottom: 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -8 },
              shadowOpacity: 0.12,
              shadowRadius: 18,
              elevation: 12,
            },
            tabBarItemStyle: {
              height: 58,
              borderRadius: 18,
              marginHorizontal: 4,
              paddingTop: 0,
              paddingBottom: 0,
            },
            tabBarIconStyle: {
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
            },
            tabBarShowLabel: false,
            lazy: false,
            animation: "none",
            sceneStyle: { backgroundColor: "white" },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: "Home",
              headerShown: false,
              tabBarIcon: ({ color }) => (
                <Entypo name="home" color={color} size={28} />
              ),
            }}
          />
          <Tabs.Screen
            name="create"
            options={{
              title: "Create",
              headerTitle: "Create 😎",
              headerTitleAlign: "center",
              headerShadowVisible: false,
              headerTitleStyle: HeaderStyles.headerTitleStyle,
              tabBarIcon: ({ color }) => (
                <MaterialIcons name="add-circle" color={color} size={32} />
              ),
            }}
          />
          <Tabs.Screen
            name="messages"
            options={{
              title: "Messages",
              headerShown: false,
              tabBarIcon: ({ color }) => (
                <Entypo name="chat" color={color} size={28} />
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
              tabBarIcon: ({ color }) => (
                <FontAwesome name="user" color={color} size={27} />
              ),
            }}
          />
        </Tabs>
      </PortalProvider>
    </ProfileProvider>
  );
}
