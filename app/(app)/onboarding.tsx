import { ProfileBottomSheet } from "@/components/BottomSheet";
import CustomButton from "@/components/Button";
import useImagePicker from "@/hooks/useImagePicker";
import { useGlobalContext } from "@/lib/GlobalContext";
import { apiClient, ApiError } from "@/lib/api/client";
import { ProfileProvider, useProfileContext } from "@/lib/ProfileContext";
import { MaterialIcons } from "@expo/vector-icons";
import { Portal, PortalProvider } from "@gorhom/portal";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { cssInterop } from "nativewind";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  InteractionManager,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
cssInterop(Image, { className: { target: "style" } });

function OnboardingContent() {
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
  const [referralCode, setReferralCode] = useState("");
  const [referralApplied, setReferralApplied] = useState<
    null | "ok" | "invalid" | "self" | "error"
  >(null);
  const isMountedRef = useRef(true);

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

  const isContinueDisabled =
    !name?.trim() || !age || age < 18 || !location?.trim();

  useEffect(() => {
    // Force editing mode on onboarding
    if (!isEditing) setIsEditing(true);
  }, [isEditing, setIsEditing]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
    [avatar],
  );

  const onContinue = async () => {
    if (isContinueDisabled) return;
    try {
      if (!currentUser || !isMountedRef.current) return;

      // Close bottom sheet if open to prevent rendering issues
      bottomSheetRef.current?.close();

      showLoader("Saving profile...");

      // Optionally apply referral code if provided
      if (referralCode?.trim()) {
        try {
          const res = await apiClient.applyReferral(referralCode.trim());
          if (
            (res.applied || res.reason === "ALREADY_APPLIED") &&
            isMountedRef.current
          ) {
            displayToast({
              type: "success" as any,
              description: "Referral applied",
            });
            setReferralApplied("ok");
          } else if (res.reason === "INVALID_CODE" && isMountedRef.current) {
            displayToast({
              type: "warning" as any,
              description: "Invalid referral code",
            });
          } else if (res.reason === "SELF_REFERRAL" && isMountedRef.current) {
            displayToast({
              type: "warning" as any,
              description: "You cannot refer yourself",
            });
          }
        } catch (e) {
          const code = e instanceof ApiError ? e.code : "ERROR";
          if (code === "INVALID_CODE" || code === "SELF_REFERRAL") {
            if (isMountedRef.current) {
              displayToast({
                type: "warning" as any,
                description:
                  code === "SELF_REFERRAL"
                    ? "You cannot refer yourself"
                    : "Invalid referral code",
              });
            }
          } else if (isMountedRef.current) {
            // Referral failures never block profile completion.
            displayToast({
              type: "error" as any,
              description: "Could not apply referral code",
            });
          }
        }
      }

      if (!isMountedRef.current) return;

      await handleSave();
      await refetchCurrentUser();

      if (!isMountedRef.current) return;

      // Hide loader before navigation to prevent UI conflicts
      hideLoader();

      // Wait for all interactions and animations to complete before navigating
      InteractionManager.runAfterInteractions(() => {
        // Add a small delay to ensure UI has fully settled
        setTimeout(() => {
          if (isMountedRef.current) {
            displayToast({
              type: "success" as any,
              description: "Profile saved",
            });
            router.replace("/(app)/(tabs)");
          }
        }, 100);
      });
    } catch (e) {
      console.error(e);
      if (isMountedRef.current) {
        displayToast({
          type: "error" as any,
          description: "Failed to save profile",
        });
      }
      hideLoader();
    }
  };

  // Removed explicit Apply button; handled in Continue

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
              placeholder="e.g 18"
              placeholderTextColor="lightgray"
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

        {/* Optional Referral Code */}
        <View className="bg-white p-5 rounded-2xl gap-4 mt-5">
          <Text className="font-plus-jakarta-semibold color-gray-400">
            Referral code (optional)
          </Text>
          <View className="w-full flex-row items-center">
            <TextInput
              value={referralCode}
              onChangeText={setReferralCode}
              autoCapitalize="characters"
              placeholder="e.g. USER-1234"
              placeholderTextColor="lightgray"
              returnKeyType="done"
              className="p-0 flex-1 text-right text-gray-900 font-plus-jakarta-regular"
            />
          </View>
          {referralApplied === "ok" && (
            <Text className="text-green-600 font-plus-jakarta-regular">
              Referral applied
            </Text>
          )}
        </View>

        <View className="mt-8">
          <CustomButton
            label="Continue"
            onPress={onContinue}
            isDisabled={isContinueDisabled}
          />
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
