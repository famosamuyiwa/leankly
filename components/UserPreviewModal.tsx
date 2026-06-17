import { BasicUser } from "@/interfaces";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  user?: BasicUser | null;
  onClose: () => void;
  onBlock: (userId: string) => void;
  isBlocked: (userId: string) => boolean;
  disableBlock?: boolean;
  onReport: (userId: string, reason: string, notes?: string) => void;
};

const UserPreviewModal = ({
  visible,
  user,
  onClose,
  onBlock,
  isBlocked,
  disableBlock,
  onReport,
}: Props) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [otherReason, setOtherReason] = useState("");
  const blocked = user ? isBlocked(user.$id) : false;
  const joined =
    user?.joinedAt &&
    new Date(user.joinedAt).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

  const reasons = [
    "Spam",
    "Harassment",
    "Inappropriate content",
    "Fake account",
    "Other",
  ];

  if (!user) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        className="flex-1 bg-black/50 items-center justify-center px-8"
        onPress={onClose}
      >
        <View className="bg-white w-full rounded-2xl p-6  gap-4">
          <TouchableOpacity
            onPress={onClose}
            className="absolute self-end right-3 top-3"
            disabled={disableBlock}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={24}
              color="grey"
            />
          </TouchableOpacity>

          <Image
            source={{ uri: user.avatar }}
            className="size-36 rounded-full self-center"
            contentFit="cover"
          />
          <View className="gap-1 items-center">
            <Text className="font-plus-jakarta-bold text-lg">
              {user.name || "Unknown user"}
              {user.age ? `, ${user.age} yrs` : ""}
            </Text>
            {joined && (
              <View className="flex-row items-center gap-2">
                <Ionicons name="calendar-clear" size={16} />

                <Text className="text-gray-500 font-plus-jakarta-regular text-xs">
                  Joined since {joined}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={() => {
              setSelectedReason("");
              setOtherReason("");
              setShowReportModal(true);
            }}
            className="w-full py-3 rounded-full bg-gray-100 flex-row items-center gap-2 justify-center"
            activeOpacity={0.7}
          >
            <Ionicons name="alert-circle" size={26} color="gray" />
            <Text className="text-center font-plus-jakarta-semibold text-gray-700">
              Report
            </Text>
          </TouchableOpacity>

          {!disableBlock && (
            <TouchableOpacity
              onPress={() => {
                if (blocked) return;
                Alert.alert(
                  "Block user",
                  `Are you sure you want to block ${user.name || "this user"}?`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Block",
                      style: "destructive",
                      onPress: () => onBlock(user.$id),
                    },
                  ]
                );
              }}
              className={`w-full py-3 rounded-full ${
                blocked ? "bg-gray-200" : "bg-red-500"
              }`}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-2 justify-center">
                <Ionicons name="ban" size={24} color="white" />
                <Text
                  className={`text-center font-plus-jakarta-semibold ${
                    blocked ? "text-gray-700" : "text-white"
                  }`}
                >
                  {blocked ? "Blocked" : "Block"}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </Pressable>

      <Modal visible={showReportModal} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center px-6 "
          onPress={() => setShowReportModal(false)}
        >
          <KeyboardAvoidingView
            behavior="padding"
            className="w-full bg-white rounded-2xl p-5 gap-4"
          >
            <Text className="font-plus-jakarta-bold text-lg text-center">
              Report {user.name || "user"}
            </Text>
            <View className="gap-2">
              {reasons.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  activeOpacity={0.7}
                  onPress={() => setSelectedReason(reason)}
                  className={`px-4 py-3 rounded-xl border ${
                    selectedReason === reason
                      ? "border-primary-300 bg-primary-50"
                      : "border-gray-200"
                  }`}
                >
                  <Text className="font-plus-jakarta-semibold text-gray-800">
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {selectedReason === "Other" && (
              <TextInput
                value={otherReason}
                onChangeText={setOtherReason}
                placeholder="Tell us more"
                placeholderTextColor="#9CA3AF"
                className="border border-gray-200 rounded-xl p-3 font-plus-jakarta-regular text-gray-800"
                multiline
              />
            )}
            <View className="flex-row gap-3 mb-5">
              <TouchableOpacity
                onPress={() => setShowReportModal(false)}
                className="flex-1 py-3 rounded-full bg-gray-100"
                activeOpacity={0.7}
              >
                <Text className="text-center font-plus-jakarta-semibold text-gray-700">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const reason =
                    selectedReason === "Other"
                      ? otherReason.trim()
                      : selectedReason;
                  if (!reason) {
                    Alert.alert("Select a reason");
                    return;
                  }
                  onReport(user.$id, reason, otherReason.trim());
                  setShowReportModal(false);
                }}
                className="flex-1 py-3 rounded-full bg-red-500"
                activeOpacity={0.7}
              >
                <Text className="text-center font-plus-jakarta-semibold text-white">
                  Submit
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </Modal>
  );
};

export default UserPreviewModal;
