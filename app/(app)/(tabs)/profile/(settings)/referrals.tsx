import { AppGradient } from "@/components/AppGradient";
import { Colors } from "@/constants/common";
import { mascotPoses } from "@/constants/data";
import { useGlobalContext } from "@/lib/GlobalContext";
import { apiClient } from "@/lib/api/client";
import { Entypo, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ReferralsScreen = () => {
  const tintColor = Colors.primary;
  const { currentUser } = useGlobalContext();
  const [code, setCode] = useState<string>("");
  const [bonusInterests, setBonusInterests] = useState<number>(0);
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      if (!currentUser?.$id) return;
      try {
        const stats = await apiClient.getReferral();
        setCode(stats.referralCode);
        setCount(stats.referralCount);
        setBonusInterests(stats.bonusInterests || 0);
      } catch {}
    };
    load();
  }, [currentUser?.$id]);

  const copyToClipboard = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    Alert.alert("Copied", "Referral code copied to clipboard.");
  };

  const shareInviteLink = async () => {
    // Check if we have a referral code
    // if (!authQuery.data?.data?.referralCode) {
    //   Alert.alert("Error", "No referral code available");
    //   return;
    // }

    // Construct the referral link
    const inviteLink = code
      ? `https://leankly.com/invite?code=${encodeURIComponent(code)}`
      : `https://leankly.com/invite`;

    // Custom invitation message
    const message = `Hey there!\n\nI just joined Leankly and thought you'd love it too! Use my referral link to get started:\n\n${inviteLink}\n\nSee you there!`;

    try {
      // Use React Native's Share API
      const result = await Share.share({
        message: message,
        // optionally specify a title for Android
        title: "Join me on Leankly!",
      });

      if (result.action === Share.sharedAction) {
        // Shared successfully
      } else if (result.action === Share.dismissedAction) {
        // Share was dismissed
      }
    } catch {
      // Fallback to clipboard
      try {
        // await Clipboard.setStringAsync(message);
        Alert.alert("Link Copied", "Invite link copied to clipboard.");
      } catch (clipboardError) {
        console.error("Clipboard error:", clipboardError);
        Alert.alert("Error", "Something went wrong while sharing.");
      }
    }
  };

  return (
    <AppGradient colors={[tintColor, tintColor, "white"]}>
      <View className="my-12">
        <Pressable onPress={() => router.back()} style={styles.arrowBack}>
          <MaterialIcons name="keyboard-backspace" size={16} color="white" />
        </Pressable>
      </View>
      <Image
        source={{ uri: mascotPoses.REFER }}
        className="h-80 w-full"
        contentFit="cover"
      />
      <View className="justify-center items-center">
        <Text className="text-2xl py-2 font-plus-jakarta-bold text-white">
          Refer and Earn
        </Text>
        <Text className="text-xs text-center font-plus-jakarta-regular">
          Invite a friend and earn 10 bonus interests for every new user
          successfully registered using your referral code
        </Text>
      </View>
      <View className="items-center pt-8">
        <Text className="text-3xl font-plus-jakarta-bold text-white shadow-primary-100 shadow-md">
          {bonusInterests}
        </Text>
      </View>
      <View className="flex-row justify-between mt-8">
        <Text className="text-sm text-white font-plus-jakarta-regular">
          Referral count: {count}
        </Text>
      </View>
      <View className="bg-accent-300 rounded-2xl flex-row justify-between items-center p-4 my-2">
        <View className="gap-5">
          <Text className="text-white font-plus-jakarta-regular">
            Your referral code
          </Text>
          <View className="flex-row gap-4">
            <Text className="text-white font-plus-jakarta-bold">
              {code || "..."}
            </Text>
            <Pressable onPress={copyToClipboard}>
              <Ionicons name="copy" color={tintColor} size={24} />
            </Pressable>
          </View>
        </View>
        <View>
          <TouchableOpacity
            onPress={shareInviteLink}
            className="flex-row gap-2 items-center bg-white p-2 rounded-full"
          >
            <Entypo name="share" color={tintColor} size={18} />
            <Text className="text-sm font-plus-jakarta-regular">
              Share invite
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </AppGradient>
  );
};

const styles = StyleSheet.create({
  arrowBack: {
    height: 40,
    width: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    borderColor: "white",
    borderWidth: 1,
    position: "absolute",

    zIndex: 999,
  },
  topImage: {
    width: "100%",
    height: 120,
    marginVertical: 20,
  },
  bottomImage: {
    width: "100%",
    height: 180,
  },
});

export default ReferralsScreen;
