import { ProfileBottomSheet } from "@/components/BottomSheet";
import useImagePicker from "@/hooks/useImagePicker";
import { useProfileContext } from "@/lib/ProfileContext";
import { useGlobalContext } from "@/lib/GlobalContext";
import { appwriteConfig, db } from "@/appwrite/config";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Portal } from "@gorhom/portal";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { cssInterop } from "nativewind";
import { useMemo, useRef } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { Query } from "react-native-appwrite";

function EditProfileContent() {
  // Interop the Image component to recognize the 'className' prop
  cssInterop(Image, {
    className: { target: "style" },
  });
  const { query } = useLocalSearchParams<{
    query?: string;
  }>();

  const { pickMultimedia } = useImagePicker();
  const { currentUser, showLoader, hideLoader, displayToast } = useGlobalContext();
  const { user } = useUser();

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
          onPress: async () => {
            if (!currentUser?.$id) return;
            const uid = currentUser.$id;

            const safeDeleteRows = async (tableId: string, queries: any[]) => {
              try {
                const { rows } = await db.listRows({
                  databaseId: appwriteConfig.db,
                  tableId,
                  queries,
                });
                for (const row of rows) {
                  try {
                    await db.deleteRow({
                      databaseId: appwriteConfig.db,
                      tableId,
                      rowId: row.$id,
                    });
                  } catch (e) {
                    console.log(`Failed deleting ${tableId} ${row.$id}`, e);
                  }
                }
              } catch (e) {
                console.log(`List failed for ${tableId}`, e);
              }
            };

            const deleteUserData = async () => {
              // Delete leanks the user owns and related rows
              try {
                const { rows: owned } = await db.listRows({
                  databaseId: appwriteConfig.db,
                  tableId: appwriteConfig.tables.leanks,
                  queries: [Query.equal("ownerId", uid)],
                });
                for (const leank of owned) {
                  const leankId = leank.$id;
                  await safeDeleteRows(appwriteConfig.tables.participants, [
                    Query.equal("leank", leankId),
                  ]);
                  await safeDeleteRows(appwriteConfig.tables.reactions, [
                    Query.equal("leankId", leankId),
                  ]);
                  await safeDeleteRows(appwriteConfig.tables.messages, [
                    Query.equal("leankId", leankId),
                  ]);
                  try {
                    await db.deleteRow({
                      databaseId: appwriteConfig.db,
                      tableId: appwriteConfig.tables.leanks,
                      rowId: leankId,
                    });
                  } catch (e) {
                    console.log("Failed deleting leank", leankId, e);
                  }
                }
              } catch (e) {
                console.log("Failed to fetch owned leanks", e);
              }

              // Delete user-related rows
              await safeDeleteRows(appwriteConfig.tables.participants, [
                Query.equal("user", uid),
              ]);
              await safeDeleteRows(appwriteConfig.tables.reactions, [
                Query.equal("userId", uid),
              ]);
              await safeDeleteRows(appwriteConfig.tables.messages, [
                Query.equal("senderId", uid),
              ]);
              await safeDeleteRows(appwriteConfig.tables.userChatMeta, [
                Query.equal("userId", uid),
              ]);

              // Delete user row
              try {
                await db.deleteRow({
                  databaseId: appwriteConfig.db,
                  tableId: appwriteConfig.tables.user,
                  rowId: uid,
                });
              } catch (e) {
                console.log("Failed deleting user row", e);
              }
            };

            try {
              showLoader("Deleting account...", true);
              await deleteUserData();
              try {
                await user?.delete();
              } catch (e) {
                console.log("Failed deleting Clerk user", e);
              }
              displayToast({ type: "success", description: "Account deleted" });
              router.replace("/sign-in");
            } catch (e) {
              console.error("Delete account failed", e);
              Alert.alert("Error", "Failed to delete account. Please try again.");
            } finally {
              hideLoader();
            }
          },
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
    } catch (e) {
      console.error(e);
    }
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
              value={age ? age.toString() : ""}
              autoCapitalize="none"
              onChangeText={(value) => setAge(Number(value))}
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
