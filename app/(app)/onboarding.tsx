import { ProfileBottomSheet } from "@/components/BottomSheet";
import CustomButton from "@/components/Button";
import useImagePicker from "@/hooks/useImagePicker";
import { useGlobalContext } from "@/lib/GlobalContext";
import { ProfileProvider, useProfileContext } from "@/lib/ProfileContext";
import { MaterialIcons } from "@expo/vector-icons";
import { Portal, PortalProvider } from "@gorhom/portal";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { cssInterop } from "nativewind";
import React, { useEffect, useMemo, useRef } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

function OnboardingContent() {
  cssInterop(Image, { className: { target: "style" } });
  const router = useRouter();
  const {
    currentUser,
    displayToast,
    showLoader,
    hideLoader,
    refetchCurrentUser,
  } = useGlobalContext();
  const { pickMultimedia } = useImagePicker();
  const bottomSheetRef = useRef<any>({});

  const {
    isEditing,
    setIsEditing,
    avatar,
    name,
    email,
    age,
    location,
    setName,
    setEmail,
    setAge,
    setAvatar,
    setAvatarMediaResult,
    handleSave,
  } = useProfileContext();

  useEffect(() => {
    // Force editing mode on onboarding
    if (!isEditing) setIsEditing(true);
  }, [isEditing]);

  const handleImagePress = async () => {
    try {
      const result: any = await pickMultimedia(false, true);
      setAvatar(result[0].uri);
      setAvatarMediaResult(result[0]);
    } catch (e) {
      console.error(e);
    }
  };

  const memoizedAvatar = useMemo(
    () => (
      <Image
        source={{ uri: avatar }}
        className="size-28 rounded-full"
        contentFit="cover"
        transition={300}
      />
    ),
    [avatar]
  );

  const onContinue = async () => {
    try {
      if (!currentUser) return;
      showLoader("Saving profile...");
      await handleSave();
      await refetchCurrentUser();
      displayToast({ type: "success" as any, description: "Profile saved" });
      router.replace("/(app)/(tabs)");
    } catch (e) {
      console.error(e);
      displayToast({
        type: "error" as any,
        description: "Failed to save profile",
      });
    } finally {
      hideLoader();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-gray-100 pt-20"
    >
      <ScrollView contentContainerStyle={{ padding: 20 }} className="flex-1">
        <Text className="text-2xl font-plus-jakarta-bold mb-2 text-center">
          Welcome! Let’s set up your profile
        </Text>
        <Text className="text-gray-500 font-plus-jakarta-regular text-center mb-8">
          Tell others a bit about you to get better matches.
        </Text>

        {/* Avatar */}
        <View className="items-center mb-8">
          <TouchableOpacity onPress={handleImagePress} activeOpacity={0.7}>
            {memoizedAvatar}
            <View className="absolute bottom-0 right-0 p-1 rounded-full bg-white">
              <MaterialIcons name="camera-enhance" size={22} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Inputs Card */}
        <View className="bg-white p-5 rounded-2xl gap-5">
          <View className="w-full flex-row items-center">
            <Text className="font-plus-jakarta-semibold color-gray-400">
              Name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              placeholder="Your name"
              className="p-0 flex-1 text-right text-gray-900 font-plus-jakarta-regular"
            />
          </View>
          <View className="bg-gray-100 h-[1]" />
          <View className="w-full flex-row items-center">
            <Text className="font-plus-jakarta-semibold color-gray-400">
              Age
            </Text>
            <TextInput
              value={age ? String(age) : ""}
              onChangeText={(v) => setAge(Number(v))}
              keyboardType="numeric"
              returnKeyType="done"
              placeholder="18"
              className="p-0 flex-1 text-right text-gray-900 font-plus-jakarta-regular"
            />
          </View>
          <View className="bg-gray-100 h-[1]" />
          <View className="w-full flex-row items-center">
            <Text className="w-14 font-plus-jakarta-semibold color-gray-400">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              editable={false}
              className="p-0 flex-1 text-right text-gray-400 font-plus-jakarta-regular"
            />
          </View>
          <View className="bg-gray-100 h-[1]" />
          <TouchableOpacity
            onPress={() => bottomSheetRef.current?.expand()}
            activeOpacity={0.6}
            className="w-full flex-row items-center"
          >
            <Text className="font-plus-jakarta-semibold color-gray-400">
              Neighborhood
            </Text>
            <Text className="flex-1 text-right text-gray-900 font-plus-jakarta-regular">
              {location || "Select location"}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mt-8">
          <CustomButton label="Continue" onPress={onContinue} />
        </View>

        <Portal>
          <ProfileBottomSheet ref={bottomSheetRef} />
        </Portal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function Onboarding() {
  return (
    <ProfileProvider>
      <PortalProvider>
        <OnboardingContent />
      </PortalProvider>
    </ProfileProvider>
  );
}
