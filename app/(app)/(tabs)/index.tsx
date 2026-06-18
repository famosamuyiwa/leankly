import {
  deleteLeankAction,
  recordLeankAction,
} from "@/appwrite/actions/leank.actions";
import { consumeBonusInterest } from "@/appwrite/actions/user.actions";
import { sendPushNotification } from "@/appwrite/config";
import { LeankCardBig } from "@/components/Cards";
import EmptyLeanks from "@/components/EmptyLeanks";
import Filters from "@/components/Filters";
import { PushNotificationTypes, Screens } from "@/constants/enums";
import images from "@/constants/images";
import { useLeanksFeed } from "@/hooks/useLeanksFeed";
import { PNAlert } from "@/interfaces";
import { useFiltersContext } from "@/lib/FiltersContext";
import { useGlobalContext } from "@/lib/GlobalContext";
import { usePremium } from "@/lib/PremiumContext";
import { FreeLimits, canUse, increment } from "@/lib/featureGates";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import Lottie from "lottie-react-native";
import { cssInterop } from "nativewind";
import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeIn } from "react-native-reanimated";
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

const waitForActionLoader = () =>
  new Promise((resolve) => setTimeout(resolve, ACTION_LOADER_DELAY_MS));

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

  const {
    currentUser,
    showLoader,
    hideLoader,
    setCurrentUser,
    blockedUserIds,
    openUserPreview,
  } = useGlobalContext();
  const { filters } = useFiltersContext();
  const { isPro, openPaywall } = usePremium();
  const filterKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);

  // ✅ use the new hook version
  const { leanks, loading, hasMore, loadedFilterKey, loadMore } = useLeanksFeed(
    currentUser?.$id,
    filters,
  );
  const isFilterLoading = loadedFilterKey !== filterKey;

  const filteredLeanks = leanks.filter(
    (l) => !blockedUserIds.includes(l.ownerId || (l.owner as any)?.$id || ""),
  );

  const isCurrentFilterDeck = deckState.filterKey === filterKey;
  const currentIndex = isCurrentFilterDeck
    ? Math.max(deckState.currentIndex, 0)
    : 0;
  const reactionHistory = isCurrentFilterDeck ? deckState.reactionHistory : [];
  const currentLeank = filteredLeanks[currentIndex];
  const isLoadingNextBatch =
    !currentLeank && hasMore && leanks.length > 0 && !isFilterLoading;
  const shouldShowDeckLoader = isFilterLoading || loading || isLoadingNextBatch;

  // ———————————————————————————
  // 2️⃣ Prefetch when near end
  // ———————————————————————————
  useEffect(() => {
    if (!isFilterLoading && !loading && hasMore && leanks.length > 0) {
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
    leanks.length,
    loading,
    loadMore,
  ]);

  // ———————————————————————————
  // 3️⃣ Handle reactions
  // ———————————————————————————
  const handleReactionPress = async (isLiked: boolean) => {
    if (isReacting) return;
    let didShowLoader = false;

    try {
      if (!currentUser?.$id) {
        Alert.alert("Please sign in to continue");
        return;
      }
      if (!currentLeank?.$id) return;

      setIsReacting(true);

      // Only gate and count when liking a leank; skips do not count
      if (isLiked && !isPro) {
        const dailyAllowed = await canUse(
          currentUser.$id,
          "interest",
          FreeLimits.INTERESTS_PER_DAY,
        );
        if (!dailyAllowed) {
          const bonus = await consumeBonusInterest(currentUser.$id);
          if (!bonus.ok) {
            openPaywall("Unlimited interests");
            return;
          }
          // Optimistically reflect bonus deduction in global user
          setCurrentUser((prev: any) =>
            prev
              ? {
                  ...prev,
                  bonusInterests: Math.max(0, (prev.bonusInterests || 0) - 1),
                }
              : prev,
          );
        }
      }

      void Haptics.impactAsync(
        isLiked
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light,
      );
      showLoader(undefined, true);
      didShowLoader = true;

      const reactedLeank = currentLeank;
      await Promise.all([
        recordLeankAction(currentUser.$id, reactedLeank.$id, isLiked),
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
              leankId: reactedLeank.$id,
              isLiked,
            },
          ],
        };
      });

      if (isLiked) {
        const pn = {
          token: reactedLeank.owner?.pushToken,
          title: "New leank request",
          content: `${currentUser.name} wants to join ${reactedLeank.title}`,
        };

        // alert leank owner
        sendPushNotification({
          type: PushNotificationTypes.ALERT,
          data: pn as PNAlert,
        });
      }

      // count only after a successful LIKE for free users
      if (isLiked && !isPro) await increment(currentUser.$id, "interest");
    } catch (err) {
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
    if (!currentUser?.$id) return;
    const lastAction = reactionHistory[reactionHistory.length - 1];

    if (!isPro) {
      const allowed = await canUse(
        currentUser.$id,
        "undo",
        FreeLimits.UNDOS_PER_DAY,
      );
      if (!allowed) {
        openPaywall("Unlimited rewinds");
        return;
      }
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showLoader(undefined, true);

    try {
      const [result] = await Promise.all([
        deleteLeankAction(currentUser.$id, lastAction.leankId),
        waitForActionLoader(),
      ]);
      if (!result.ok) return;

      setDeckState({
        filterKey,
        currentIndex: lastAction.index,
        reactionHistory: reactionHistory.slice(0, -1),
      });

      if (!isPro) {
        await increment(currentUser.$id, "undo");
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
      <View
        className="flex-1 bg-white"
        style={{ paddingTop: insets.top }}
      >
        {/* Header filters */}
        <View className="pl-5">
          <Filters screen={Screens.HOME} />
        </View>

        {/* Main content */}
        {!shouldShowDeckLoader && currentLeank ? (
          <View className="flex-1 px-5 pt-5">
            <View className="h-5/6 items-center">
              <View
                className={`rounded-3xl h-5 bg-white shadow-md ${
                  Platform.OS === "ios" ? "shadow-slate-200" : "shadow-gray-300"
                } absolute w-5/6 bottom-2`}
              />
              <Animated.View
                key={currentLeank.$id}
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
                  color={reactionHistory.length > 0 ? "black" : "lightgrey"}
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
      </View>
    </GestureHandlerRootView>
  );
}
