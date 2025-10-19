import { ProfileBottomSheet } from "@/components/BottomSheet";
import useImagePicker from "@/hooks/useImagePicker";
import { useProfileContext } from "@/lib/ProfileContext";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Portal } from "@gorhom/portal";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { cssInterop } from "nativewind";
import { useMemo, useRef } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";

function EditProfileContent() {
  // Interop the Image component to recognize the 'className' prop
  cssInterop(Image, {
    className: { target: "style" },
  });
  const { query } = useLocalSearchParams<{
    query?: string;
  }>();

  const { pickMultimedia } = useImagePicker();

  const bottomSheetRef = useRef<any>({});

  const {
    isEditing,
    isSaving,
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
    handleCancel: contextHandleCancel,
  } = useProfileContext();

  const handleCancel = () => {
    if (isSaving) return;
    contextHandleCancel();
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Deleting your account will permanently remove all your data. This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {},
        },
      ]
    );
  };

  const handleImagePress = async () => {
    if (!isEditing) return;
    try {
      const result: any = await pickMultimedia(false, true);
      setAvatar(result[0].uri);
      setAvatarMediaResult(result[0]);
    } catch {}
  };

  const memoizedAvatar = useMemo(() => {
    return (
      <Image
        source={{ uri: avatar }}
        className="size-32 rounded-full"
        contentFit="cover"
        transition={300}
      />
    );
  }, [avatar]);

  return (
    <GestureHandlerRootView className="flex-1 ">
      <Animated.View
        layout={LinearTransition}
        entering={FadeIn.duration(500)}
        className="flex flex-1 bg-gray-100 p-5 gap-10"
      >
        {/* Avatar */}
        <View className="items-center justify-center">
          <TouchableOpacity onPress={handleImagePress}>
            {memoizedAvatar}
            {isEditing && (
              <View className="absolute bottom-0 right-0 p-1 rounded-full bg-gray-100">
                <MaterialIcons name="camera-enhance" size={24} />
              </View>
            )}
          </TouchableOpacity>
          {!isEditing && (
            <TouchableOpacity
              onPress={() => setIsEditing(true)}
              className="flex-row py-1 px-4 my-4 bg-white items-center"
            >
              <Feather name="edit" size={14} />
              <Text className="pl-2 font-plus-jakarta-regular">Edit</Text>
            </TouchableOpacity>
          )}
          {isEditing && (
            <View className="flex-row items-center py-1 px-4 my-4 gap-4">
              <TouchableOpacity
                onPress={handleCancel}
                className="flex-row items-center"
              >
                <MaterialIcons
                  className="pr-1"
                  name="edit-off"
                  size={14}
                  color="red"
                />
                <Text className="text-red-500 font-plus-jakarta-regular">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {/* Info */}

        <View className="bg-white p-5 rounded-2xl">
          <View className="w-full flex-row  ">
            <Text className=" font-plus-jakarta-semibold color-gray-400">
              Name
            </Text>
            <TextInput
              value={name}
              autoCapitalize="none"
              onChangeText={setName}
              className={`p-0  flex-1 text-right ${isEditing ? "text-gray-900" : "text-gray-400"} font-plus-jakarta-regular`}
              editable={isEditing}
            />
          </View>
          {/* Separator */}
          <View className="bg-gray-100 h-[1] my-5" />
          <View className="w-full flex-row ">
            <Text className="font-plus-jakarta-semibold color-gray-400">
              Age
            </Text>
            <TextInput
              value={age}
              autoCapitalize="none"
              onChangeText={setAge}
              keyboardType="numeric"
              returnKeyType="done"
              className={`p-0  flex-1 text-right ${isEditing ? "text-gray-900" : "text-gray-400"} font-plus-jakarta-regular `}
              editable={isEditing}
            />
          </View>
          {/* Separator */}
          <View className="bg-gray-100 h-[1] my-5" />
          <View className="w-full flex-row">
            <Text className="w-14 font-plus-jakarta-semibold color-gray-400">
              Email
            </Text>
            <TextInput
              value={email}
              autoCapitalize="none"
              onChangeText={setEmail}
              className={`p-0  flex-1 text-right  text-gray-400 font-plus-jakarta-regular`}
              editable={false}
            />
          </View>
          {/* Separator */}
          <View className="bg-gray-100 h-[1] my-5" />
          <TouchableOpacity
            onPress={() => {
              if (!isEditing) return;
              bottomSheetRef.current?.expand();
            }}
            activeOpacity={0.6}
            className="w-full flex-row"
          >
            <Text className=" font-plus-jakarta-semibold color-gray-400">
              Neigborhood
            </Text>
            <Text
              className={`flex-1 text-right ${isEditing ? "text-gray-900" : "text-gray-400"} font-plus-jakarta-regular`}
            >
              {location}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Delete Account */}
        <TouchableOpacity
          className="bg-white selection:rounded-2xl p-4 shadow-sm"
          onPress={handleDeleteAccount}
          activeOpacity={0.6}
        >
          <View className="flex-row items-center justify-center">
            <Ionicons name="trash" size={20} color="#dc2626" />
            <Text className="text-red-600 font-plus-jakarta-semibold text-lg ml-2">
              Delete Account
            </Text>
          </View>
        </TouchableOpacity>
        <Portal>
          <ProfileBottomSheet query={query} ref={bottomSheetRef} />
        </Portal>
      </Animated.View>
    </GestureHandlerRootView>
  );
}

export default function EditProfile() {
  return <EditProfileContent />;
}
