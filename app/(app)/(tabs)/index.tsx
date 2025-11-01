import { recordLeankAction } from "@/appwrite/actions/leank.actions";
import { sendPushNotification } from "@/appwrite/config";
import { LeankCardBig } from "@/components/Cards";
import Filters from "@/components/Filters";
import { PushNotificationTypes, Screens } from "@/constants/enums";
import images from "@/constants/images";
import { useLeanksFeed } from "@/hooks/useLeanksFeed";
import { PNAlert } from "@/interfaces";
import { useFiltersContext } from "@/lib/FiltersContext";
import { useGlobalContext } from "@/lib/GlobalContext";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import Lottie from "lottie-react-native";
import { cssInterop } from "nativewind";
import { useEffect, useState } from "react";
import { Alert, Platform, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  // Interop the Image component to recognize the 'className' prop
  cssInterop(Image, {
    className: { target: "style" },
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [previousIndexes, setPreviousIndexes] = useState<number[]>([]);

  const { currentUser, showLoader, hideLoader } = useGlobalContext();
  const { filters } = useFiltersContext();

  // ✅ use the new hook version
  const { leanks, loading, hasMore, refresh, loadMore } = useLeanksFeed(
    currentUser?.$id,
    filters
  );

  const currentLeank = leanks[currentIndex];

  // ———————————————————————————
  // 1️⃣ Reset on new filters
  // ———————————————————————————
  useEffect(() => {
    setCurrentIndex(0);
    setPreviousIndexes([]);
  }, [filters]);

  // ———————————————————————————
  // 2️⃣ Prefetch when near end
  // ———————————————————————————
  useEffect(() => {
    if (!loading && hasMore && leanks.length > 0) {
      const threshold = 1;
      if (currentIndex >= leanks.length - threshold) {
        loadMore();
      }
    }
  }, [currentIndex, leanks.length, hasMore, loading, loadMore]);

  // ———————————————————————————
  // 3️⃣ Handle reactions
  // ———————————————————————————
  const handleReactionPress = async (isLiked: boolean) => {
    try {
      showLoader(undefined, true);
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (currentLeank && currentUser) {
        setPreviousIndexes((prev) => [...prev, currentIndex]);
        await recordLeankAction(currentUser.$id, currentLeank.$id, isLiked);
      }

      const pn = {
        token: currentLeank.owner?.pushToken,
        title: "New leank request",
        content: `${currentUser?.name} wants to join ${currentLeank.title}`,
      };

      // alert leank owner
      sendPushNotification({
        type: PushNotificationTypes.ALERT,
        data: pn as PNAlert,
      });

      setCurrentIndex((prev) => prev + 1);
    } catch (err) {
      console.error("Reaction error:", err);
    } finally {
      hideLoader();
    }
  };

  // ———————————————————————————
  // 4️⃣ Undo last swipe
  // ———————————————————————————
  const handleUndo = async () => {
    if (previousIndexes.length === 0) return;
    showLoader(undefined, true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setCurrentIndex((prev) => {
      if (!previousIndexes.length) return prev;
      const lastIndex = previousIndexes[previousIndexes.length - 1];
      setPreviousIndexes((p) => p.slice(0, -1));
      return lastIndex;
    });

    hideLoader();
  };

  const onLikePress = () => {
    Alert.alert("Interest", "Show interest in this leank?", [
      { text: "Cancel", style: "cancel" },
      { text: "Yes", onPress: () => handleReactionPress(true) },
    ]);
  };

  // ———————————————————————————
  // 5️⃣ Render
  // ———————————————————————————
  if (!insets) return null;

  return (
    <GestureHandlerRootView className="flex-1 bg-white">
      <Animated.View
        layout={LinearTransition}
        entering={FadeIn.duration(500)}
        className="flex-1 bg-white"
        style={{ paddingTop: insets.top }}
      >
        {/* Header filters */}
        <View className="pl-5">
          <Filters screen={Screens.HOME} />
        </View>

        {/* Main content */}
        {currentLeank ? (
          <View className="flex-1 px-5 pt-5">
            <View className="h-5/6 items-center">
              <View
                className={`rounded-3xl h-5 bg-white shadow-md ${
                  Platform.OS === "ios" ? "shadow-slate-200" : "shadow-gray-300"
                } absolute w-5/6 bottom-2`}
              />
              <LeankCardBig item={currentLeank} />
            </View>

            {/* Reaction buttons */}
            <View className="flex-row gap-16 items-center justify-center flex-1">
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={handleUndo}
                className="absolute left-0 bottom-5 bg-white shadow-md rounded-full size-14 shadow-gray-300 items-center justify-center"
              >
                <Ionicons
                  name="return-down-back"
                  size={20}
                  color={previousIndexes.length > 0 ? "black" : "lightgrey"}
                />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => handleReactionPress(false)}
                className="bg-white shadow-md rounded-full size-20 shadow-gray-300 items-center justify-center"
              >
                <Feather name="x" size={35} color="black" />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.6}
                onPress={onLikePress}
                className="bg-white shadow-md rounded-full size-20 shadow-gray-300 items-center justify-center"
              >
                <MaterialCommunityIcons
                  name="heart"
                  size={35}
                  color="#dc2626"
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Animated.View
            layout={LinearTransition}
            entering={FadeIn.duration(250)}
            className="flex-1 items-center justify-center"
          >
            {loading ? (
              <View className="items-center justify-center">
                <Image
                  source={images.whiteIcon}
                  className="absolute size-10  z-10"
                  contentFit="contain"
                />
                <Lottie
                  source={require("@/assets/animations/searching.json")}
                  loop={true}
                  autoPlay={true}
                  style={{
                    width: 120,
                    height: 120,
                  }}
                />
              </View>
            ) : (
              <Text className="font-plus-jakarta-semibold text-lg">
                No more leanks to show right now 👏
              </Text>
            )}
          </Animated.View>
        )}
      </Animated.View>
    </GestureHandlerRootView>
  );
}
