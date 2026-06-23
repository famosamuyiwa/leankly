import { LeankCardBig } from "@/components/Cards";
import EmptyLeanks from "@/components/EmptyLeanks";
import Filters from "@/components/Filters";
import { Screens, ToastType } from "@/constants/enums";
import images from "@/constants/images";
import { useLeanksFeed } from "@/hooks/useLeanksFeed";
import { useFiltersContext } from "@/lib/FiltersContext";
import { useGlobalContext } from "@/lib/GlobalContext";
import { usePremium } from "@/lib/PremiumContext";
import { apiClient, ApiError } from "@/lib/api/client";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import Lottie from "lottie-react-native";
import { cssInterop } from "nativewind";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  NativeTouchEvent,
  Platform,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  FadeIn,
  interpolate,
  runOnUI,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ReactionHistoryItem = {
  index: number;
  leankId: string;
  isLiked: boolean;
};

type DeckState = {
  filterKey: string;
  currentIndex: number;
  reactionHistory: ReactionHistoryItem[];
};

const ACTION_LOADER_DELAY_MS = 1000;
const PULL_REFRESH_THRESHOLD = 72;
const PULL_LOGO_MAX_DISTANCE = 96;
const PULL_DECK_MAX_TRANSLATE_Y = 56;
const PULL_LOGO_RESET_DURATION_MS = 160;

const waitForActionLoader = () =>
  new Promise((resolve) => setTimeout(resolve, ACTION_LOADER_DELAY_MS));

const setPullLogoDistanceOnUI = (
  sharedValue: SharedValue<number>,
  distance: number,
) => {
  "worklet";

  sharedValue.value = distance;
};

const resetPullLogoDistanceOnUI = (
  sharedValue: SharedValue<number>,
  duration: number,
) => {
  "worklet";

  sharedValue.value = withTiming(0, { duration });
};

// Interop the Image component to recognize the 'className' prop
cssInterop(Image, {
  className: { target: "style" },
});
export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const [deckState, setDeckState] = useState<DeckState>({
    filterKey: "",
    currentIndex: 0,
    reactionHistory: [],
  });
  const [isReacting, setIsReacting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshInFlightRef = useRef(false);
  const scrollOffsetYRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const hasMetPullThresholdRef = useRef(false);
  const pullDistance = useSharedValue(0);

  const {
    currentUser,
    showLoader,
    hideLoader,
    blockedUserIds,
    openUserPreview,
    displayToast,
  } = useGlobalContext();
  const { filters } = useFiltersContext();
  const { openPaywall } = usePremium();
  const filterKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);

  // ✅ use the new hook version
  const {
    leanks,
    loading,
    hasMore,
    loadedFilterKey,
    refresh: refreshFeed,
    loadMore,
  } = useLeanksFeed(currentUser?.id, filters);
  const isFilterLoading = loadedFilterKey !== filterKey;

  const filteredLeanks = leanks.filter(
    (l) => !blockedUserIds.includes(l.ownerId || l.owner?.id || ""),
  );

  const isCurrentFilterDeck = deckState.filterKey === filterKey;
  const currentIndex = isCurrentFilterDeck
    ? Math.max(deckState.currentIndex, 0)
    : 0;
  const reactionHistory = isCurrentFilterDeck ? deckState.reactionHistory : [];
  const currentLeank = filteredLeanks[currentIndex];
  const isLoadingNextBatch =
    !currentLeank && hasMore && leanks.length > 0 && !isFilterLoading;
  const shouldShowDeckLoader =
    !isRefreshing && (isFilterLoading || loading || isLoadingNextBatch);

  const pullLogoAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      pullDistance.value,
      [0, PULL_LOGO_MAX_DISTANCE],
      [0.35, 1],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      pullDistance.value,
      [4, 28],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      pullDistance.value,
      [0, PULL_LOGO_MAX_DISTANCE],
      [-20, 28],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [{ translateY }, { scale }],
    };
  });

  const deckPullAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      pullDistance.value,
      [0, PULL_LOGO_MAX_DISTANCE],
      [0, PULL_DECK_MAX_TRANSLATE_Y],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ translateY }],
    };
  });

  // ———————————————————————————
  // 2️⃣ Prefetch when near end
  // ———————————————————————————
  useEffect(() => {
    if (
      !isRefreshing &&
      !isFilterLoading &&
      !loading &&
      hasMore &&
      leanks.length > 0
    ) {
      const threshold = 1;
      if (currentIndex >= filteredLeanks.length - threshold) {
        loadMore();
      }
    }
  }, [
    currentIndex,
    filteredLeanks.length,
    hasMore,
    isFilterLoading,
    isRefreshing,
    leanks.length,
    loading,
    loadMore,
  ]);

  const handleRefresh = async () => {
    if (refreshInFlightRef.current || !currentUser?.id) return;

    refreshInFlightRef.current = true;
    setIsRefreshing(true);
    runOnUI(resetPullLogoDistanceOnUI)(
      pullDistance,
      PULL_LOGO_RESET_DURATION_MS,
    );
    setDeckState({
      filterKey,
      currentIndex: 0,
      reactionHistory: [],
    });
    showLoader(undefined, true);

    try {
      await Promise.all([refreshFeed(), waitForActionLoader()]);
    } catch (error) {
      console.error("Feed refresh error:", error);
      displayToast({
        type: ToastType.ERROR,
        description: "Could not refresh leanks. Pull down to try again.",
      });
    } finally {
      hideLoader();
      refreshInFlightRef.current = false;
      setIsRefreshing(false);
    }
  };

  const updatePullDistance = (distance: number) => {
    const clampedDistance = Math.min(distance, PULL_LOGO_MAX_DISTANCE);
    pullDistanceRef.current = clampedDistance;

    if (
      clampedDistance >= PULL_REFRESH_THRESHOLD &&
      !hasMetPullThresholdRef.current
    ) {
      hasMetPullThresholdRef.current = true;
      void Haptics.selectionAsync();
    } else if (clampedDistance < PULL_REFRESH_THRESHOLD * 0.75) {
      hasMetPullThresholdRef.current = false;
    }

    runOnUI(setPullLogoDistanceOnUI)(pullDistance, clampedDistance);
  };

  const resetPullGesture = () => {
    touchStartYRef.current = null;
    pullDistanceRef.current = 0;
    hasMetPullThresholdRef.current = false;
    runOnUI(resetPullLogoDistanceOnUI)(
      pullDistance,
      PULL_LOGO_RESET_DURATION_MS,
    );
  };

  const handleDeckScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetYRef.current = event.nativeEvent.contentOffset.y;
  };

  const handleDeckTouchStart = (
    event: NativeSyntheticEvent<NativeTouchEvent>,
  ) => {
    touchStartYRef.current = event.nativeEvent.pageY;
    pullDistanceRef.current = 0;
    hasMetPullThresholdRef.current = false;
  };

  const handleDeckTouchMove = (
    event: NativeSyntheticEvent<NativeTouchEvent>,
  ) => {
    if (
      isRefreshing ||
      touchStartYRef.current === null ||
      scrollOffsetYRef.current > 0
    ) {
      touchStartYRef.current = event.nativeEvent.pageY;
      if (pullDistanceRef.current > 0) updatePullDistance(0);
      return;
    }

    const pullDistanceY = event.nativeEvent.pageY - touchStartYRef.current;

    if (pullDistanceY > 0) {
      updatePullDistance(pullDistanceY);
    } else if (pullDistanceRef.current > 0) {
      updatePullDistance(0);
    }
  };

  const handleDeckTouchEnd = () => {
    const shouldRefresh =
      pullDistanceRef.current >= PULL_REFRESH_THRESHOLD &&
      scrollOffsetYRef.current <= 0 &&
      Boolean(currentUser?.id) &&
      !refreshInFlightRef.current;

    if (shouldRefresh) {
      touchStartYRef.current = null;
      pullDistanceRef.current = 0;
      hasMetPullThresholdRef.current = false;
      void handleRefresh();
      return;
    }

    resetPullGesture();
  };

  const handleDeckTouchCancel = () => {
    resetPullGesture();
  };

  // ———————————————————————————
  // 3️⃣ Handle reactions
  // ———————————————————————————
  const handleReactionPress = async (isLiked: boolean) => {
    if (isReacting) return;
    let didShowLoader = false;

    try {
      if (!currentUser?.id) {
        Alert.alert("Please sign in to continue");
        return;
      }
      if (!currentLeank?.id) return;

      setIsReacting(true);

      void Haptics.impactAsync(
        isLiked
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light,
      );
      showLoader(undefined, true);
      didShowLoader = true;

      const reactedLeank = currentLeank;
      await Promise.all([
        apiClient.react(reactedLeank.id, isLiked ? "like" : "skip"),
        waitForActionLoader(),
      ]);

      setDeckState((prev) => {
        const history =
          prev.filterKey === filterKey ? prev.reactionHistory : [];
        return {
          filterKey,
          currentIndex: currentIndex + 1,
          reactionHistory: [
            ...history,
            {
              index: currentIndex,
              leankId: reactedLeank.id,
              isLiked,
            },
          ],
        };
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        openPaywall("Unlimited interests");
      }
      console.error("Reaction error:", err);
    } finally {
      if (didShowLoader) hideLoader();
      setIsReacting(false);
    }
  };

  // ———————————————————————————
  // 4️⃣ Undo last interest
  // ———————————————————————————
  const handleUndo = async () => {
    if (reactionHistory.length === 0) return;
    if (!currentUser?.id) return;
    const lastAction = reactionHistory[reactionHistory.length - 1];

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showLoader(undefined, true);

    try {
      const [result] = await Promise.all([
        apiClient.undoReaction(lastAction.leankId),
        waitForActionLoader(),
      ]);
      if (!result.undone) return;

      setDeckState({
        filterKey,
        currentIndex: lastAction.index,
        reactionHistory: reactionHistory.slice(0, -1),
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 402) {
        openPaywall("Unlimited rewinds");
      }
    } finally {
      hideLoader();
    }
  };

  // ———————————————————————————
  // 5️⃣ Render
  // ———————————————————————————
  if (!insets) return null;

  return (
    <GestureHandlerRootView className="flex-1 bg-white">
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        {/* Header filters */}
        <View className="pl-5">
          <Filters screen={Screens.HOME} />
        </View>

        {/* Main content */}
        <View className="relative flex-1">
          {!isRefreshing && (
            <Animated.View
              pointerEvents="none"
              className="absolute left-0 right-0 z-10 items-center"
              style={[{ top: -25 }, pullLogoAnimatedStyle]}
            >
              <View className="items-center justify-center">
                <Image
                  source={images.whiteIcon}
                  className="absolute size-5  z-10"
                  contentFit="contain"
                />
                <Lottie
                  source={require("@/assets/animations/searching.json")}
                  loop={false}
                  autoPlay={false}
                  progress={1}
                  style={{
                    width: 60,
                    height: 60,
                  }}
                />
              </View>
            </Animated.View>
          )}

          <Animated.ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1 }}
            alwaysBounceVertical={false}
            bounces={true}
            overScrollMode="auto"
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={handleDeckScroll}
            onTouchStart={handleDeckTouchStart}
            onTouchMove={handleDeckTouchMove}
            onTouchEnd={handleDeckTouchEnd}
            onTouchCancel={handleDeckTouchCancel}
          >
            <Animated.View className="flex-1" style={deckPullAnimatedStyle}>
              {isRefreshing ? (
                <View className="flex-1 bg-white" />
              ) : !shouldShowDeckLoader && currentLeank ? (
                <View className="flex-1 px-5 pt-5">
                  <View className="h-5/6 items-center">
                    <View
                      className={`rounded-3xl h-5 bg-white shadow-md ${
                        Platform.OS === "ios"
                          ? "shadow-slate-200"
                          : "shadow-gray-300"
                      } absolute w-5/6 bottom-2`}
                    />
                    <Animated.View
                      key={currentLeank.id}
                      entering={FadeIn.duration(180)}
                      className="w-full flex-1"
                    >
                      <LeankCardBig
                        item={currentLeank}
                        onAvatarPress={(user) => openUserPreview(user)}
                      />
                    </Animated.View>
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
                        color={
                          reactionHistory.length > 0 ? "black" : "lightgrey"
                        }
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.6}
                      onPress={() => handleReactionPress(false)}
                      disabled={isReacting}
                      className="bg-white shadow-md rounded-full size-20 shadow-gray-300 items-center justify-center"
                    >
                      <Feather name="x" size={35} color="black" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.6}
                      onPress={() => handleReactionPress(true)}
                      disabled={isReacting}
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
                <View className="flex-1 items-center justify-center">
                  {shouldShowDeckLoader ? (
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
                    <EmptyLeanks isIconVisible />
                  )}
                </View>
              )}
            </Animated.View>
          </Animated.ScrollView>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}
