import { Links, Screens } from "@/constants/enums";
import { useGlobalContext } from "@/lib/GlobalContext";
import { useProfileContext } from "@/lib/ProfileContext";
import { useAuthSession } from "@/lib/auth/AuthContext";
import {
  Feather,
  FontAwesome6,
  Ionicons,
  MaterialCommunityIcons,
  Octicons,
} from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { cssInterop } from "nativewind";
import { useCallback, useMemo } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";

// Interop the Image component to recognize the 'className' prop
cssInterop(Image, {
  className: { target: "style" },
});

export default function Settings() {
  const { logout } = useAuthSession();
  const { alertComingSoon } = useGlobalContext();
  const { avatar, name } = useProfileContext();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(app)/sign-in");
        },
      },
    ]);
  };

  const handleNavigation = useCallback(
    (action: Screens | Links) => {
      let route: any;
      switch (action) {
        case Screens.NOTIFICATIONS:
          alertComingSoon();
          break;
        case Links.CONTACT_SUPPORT:
          Linking.openURL("https://leankly.com/contact");
          break;
        case Links.PRIVACY_POLICY:
          Linking.openURL("https://leankly.com/privacy");
          break;
        case Links.SOCIAL_MEDIA:
          Linking.openURL("https://x.com/leanklyapp");
          break;
        case Screens.EDIT_PROFILE:
          route = "/(app)/(tabs)/profile/(settings)/edit-profile";
          break;
        case Screens.REFER_A_FRIEND:
          route = "/(app)/(tabs)/profile/(settings)/referrals";
          break;
        default:
          route = "/";
      }
      if (!route) return;
      router.navigate(route);
    },
    [alertComingSoon],
  );

  const memoizedProfile = useMemo(() => {
    return (
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={() => handleNavigation(Screens.EDIT_PROFILE)}
        className="bg-white rounded-2xl p-5"
      >
        <View className="flex-row gap-5">
          <Image
            source={avatar}
            className="w-16 h-16 rounded-full"
            contentFit="cover"
          />
          <View className="flex-row justify-between flex-1 items-center">
            <View className="justify-around">
              <Text className="font-plus-jakarta-bold text-lg">{name}</Text>
              <Text className="font-plus-jakarta-regular color-gray-400">
                Edit Profile
              </Text>
            </View>
            <Ionicons name="chevron-forward" color="#d1d5db" size={20} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [avatar, handleNavigation, name]);

  return (
    <Animated.ScrollView
      layout={LinearTransition}
      entering={FadeIn.duration(500)}
      className="flex flex-1 bg-gray-100 p-5 "
      showsVerticalScrollIndicator={false}
    >
      {/* Profile */}
      {memoizedProfile}

      {/* Preference */}
      <View className="gap-2 mt-10">
        <Text className="font-plus-jakarta-regular color-gray-400 text-sm">
          PREFERENCE
        </Text>
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={() => handleNavigation(Screens.NOTIFICATIONS)}
          className="w-full flex-row justify-between bg-white p-5 rounded-2xl"
        >
          <View className="flex-row items-center gap-3">
            <View className="bg-red-600 rounded-2xl p-2">
              <Octicons name="bell-fill" color="white" />
            </View>
            <Text className="font-plus-jakarta-semibold">Notifications</Text>
          </View>
          <Ionicons name="chevron-forward" color="#d1d5db" size={20} />
        </TouchableOpacity>
      </View>

      {/* Resources */}
      <View className="gap-2 mt-10">
        <Text className="font-plus-jakarta-regular color-gray-400 text-sm">
          RESOURCES
        </Text>
        <View className="bg-white p-5 rounded-2xl">
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => handleNavigation(Screens.REFER_A_FRIEND)}
            className="w-full flex-row justify-between "
          >
            <View className="flex-row items-center gap-3">
              <View className="bg-green-600 rounded-2xl p-2">
                <MaterialCommunityIcons name="account-plus" color="white" />
              </View>
              <Text className="font-plus-jakarta-semibold">Refer and Earn</Text>
            </View>
            <Ionicons name="chevron-forward" color="#d1d5db" size={20} />
          </TouchableOpacity>

          {/* Separator */}
          <View className="bg-gray-100 h-[1] my-5" />
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => handleNavigation(Links.PRIVACY_POLICY)}
            className="w-full flex-row justify-between "
          >
            <View className="flex-row items-center gap-3">
              <View className="bg-yellow-600 rounded-2xl p-2">
                <MaterialCommunityIcons name="shield-check" color="white" />
              </View>
              <Text className="font-plus-jakarta-semibold">Privacy Policy</Text>
            </View>
            <Feather name="external-link" color="#d1d5db" size={20} />
          </TouchableOpacity>
          {/* Separator */}
          <View className="bg-gray-100 h-[1] my-5" />
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => handleNavigation(Links.CONTACT_SUPPORT)}
            className="w-full flex-row justify-between "
          >
            <View className="flex-row items-center gap-3">
              <View className="bg-blue-600 rounded-2xl p-2">
                <Ionicons name="mail" color="white" />
              </View>
              <Text className="font-plus-jakarta-semibold">
                Contact Support
              </Text>
            </View>
            <Feather name="external-link" color="#d1d5db" size={20} />
          </TouchableOpacity>
          {/* Separator */}
          <View className="bg-gray-100 h-[1] my-5" />
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => handleNavigation(Links.SOCIAL_MEDIA)}
            className="w-full flex-row justify-between "
          >
            <View className="flex-row items-center gap-3">
              <View className="bg-black rounded-2xl p-2">
                <FontAwesome6 name="x-twitter" color="white" />
              </View>
              <Text className="font-plus-jakarta-semibold">
                Follow @leanklyapp
              </Text>
            </View>
            <Feather name="external-link" color="#d1d5db" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        onPress={handleSignOut}
        className="bg-white rounded-2xl p-4 shadow-sm my-10"
        activeOpacity={0.6}
      >
        <View className="flex-row items-center justify-center">
          <Ionicons name="log-out-outline" size={20} color="red" />
          <Text className="text-red-600 font-plus-jakarta-semibold text-lg ml-2">
            Sign Out
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.ScrollView>
  );
}
