import { recordLeankAction } from "@/appwrite/actions/leank.actions";
import { LeankCardBig } from "@/components/Cards";
import Filters from "@/components/Filters";
import { Screens } from "@/constants/enums";
import { useLeanksFeed } from "@/hooks/useLeanksFeed";
import { useFiltersContext } from "@/lib/FiltersContext";
import { useGlobalContext } from "@/lib/GlobalContext";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, Platform, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previousIndexes, setPreviousIndexes] = useState<number[]>([]);

  const { currentUser } = useGlobalContext();
  const { filters } = useFiltersContext();

  const { leanks, fetchLeanks, loading, hasMore } = useLeanksFeed(
    currentUser?.$id,
    filters
  );
  const currentLeank = leanks[currentIndex];

  const { showLoader, hideLoader } = useGlobalContext();

  useEffect(() => {
    fetchLeanks();
  }, [filters]);

  useEffect(() => {
    if (currentIndex >= leanks.length - 3 && hasMore && !loading) {
      fetchLeanks(); // prefetch next batch
    }
  }, [currentIndex]);

  const handleReactionPress = async (isLiked: boolean) => {
    try {
      showLoader(undefined, true);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1s delay

      if (currentLeank && currentUser) {
        setPreviousIndexes((prev) => [...prev, currentIndex]);

        await recordLeankAction(currentUser.$id, currentLeank.$id, isLiked);
      }
      setCurrentIndex((prev) => prev + 1);
    } catch (e) {
      console.log(e);
    } finally {
      hideLoader();
    }
  };

  const handleUndo = async () => {
    showLoader(undefined, true);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 1s delay

    setCurrentIndex((prev) => {
      if (previousIndexes.length === 0) return prev; // nothing to undo

      // get last viewed index
      const lastIndex = previousIndexes[previousIndexes.length - 1];

      // remove it from the stack
      setPreviousIndexes((p) => p.slice(0, -1));

      return lastIndex;
    });

    hideLoader();
  };

  const onLikePress = () => {
    Alert.alert(
      "Interest",
      "Are you sure you want to show interest in this leank?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: () => handleReactionPress(true),
        },
      ]
    );
  };

  if (!insets) {
    return null; // Prevents glitching by waiting for insets
  }

  return (
    <GestureHandlerRootView className="flex-1 bg-white">
      <Animated.View
        layout={LinearTransition}
        entering={FadeIn.duration(500)}
        className="flex-1 bg-white"
        style={{ paddingTop: insets.top }}
      >
        <View className="pl-5">
          <Filters screen={Screens.HOME} />
        </View>
        {currentLeank ? (
          <View className="flex-1 px-5 pt-5">
            <View className="h-5/6 items-center">
              <View
                className={`rounded-3xl h-5 bg-white shadow-md ${Platform.OS === "ios" ? "shadow-slate-200" : "shadow-gray-300 "} absolute w-5/6 bottom-2`}
              />

              <LeankCardBig item={currentLeank} />
            </View>

            <View className="flex-row gap-16 items-center justify-center flex-1">
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={handleUndo}
                className="absolute left-0 bottom-5 bg-white shadow-md rounded-full size-14  shadow-gray-300 items-center justify-center"
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
                className="bg-white shadow-md rounded-full size-20  shadow-gray-300 items-center justify-center"
              >
                <Feather name="x" size={35} color="black" />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={onLikePress}
                className="bg-white shadow-md rounded-full size-20  shadow-gray-300 items-center justify-center"
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
          <View className="flex-1 items-center justify-center">
            <Text className="font-plus-jakarta-semibold text-lg">
              No more Leanks to show at this moment 👏
            </Text>
          </View>
        )}
      </Animated.View>
    </GestureHandlerRootView>
  );
}
