import { HeaderLeft } from "@/components/HeaderUI";
import { HeaderStyles } from "@/constants/common";
import { useProfileContext } from "@/lib/ProfileContext";
import { Stack } from "expo-router";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";

function SettingsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Settings",
          headerShadowVisible: false,
          headerTitleStyle: HeaderStyles.headerTitleStyle,
          headerTitleAlign: "center",
          headerStyle: {
            backgroundColor: "#f3f4f6",
          },
          headerLeft: () => <HeaderLeft />,
        }}
      />
      <Stack.Screen name="referrals" options={{ headerShown: false }} />

      <Stack.Screen
        name="edit-profile"
        options={{
          title: "Edit Profile",
          headerTitleStyle: HeaderStyles.headerTitleStyle,
          headerTitleAlign: "center",

          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: "#f3f4f6",
          },
          headerLeft: () => <EditProfileHeaderLeft />,
          headerRight: () => <EditProfileHeaderButton />,
        }}
      />
    </Stack>
  );
}

function EditProfileHeaderButton() {
  const { isEditing, isSaving, hasChanges, handleSave } = useProfileContext();

  if (!isEditing) {
    return null;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={handleSave}
      disabled={isSaving || !hasChanges}
      className={`h-12 w-20 rounded-full items-center justify-center ${
        isSaving || !hasChanges ? "bg-gray-400" : "bg-black"
      }`}
    >
      {isSaving ? (
        <ActivityIndicator color="white" size="small" />
      ) : (
        <Text className="font-plus-jakarta-semibold color-white">Save</Text>
      )}
    </TouchableOpacity>
  );
}

function EditProfileHeaderLeft() {
  const { handleCancel } = useProfileContext();

  return <HeaderLeft reset={handleCancel} />;
}

export default SettingsLayout;
