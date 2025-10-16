import { FilterBottomSheet } from "@/components/BottomSheet";
import { LeankCardBig } from "@/components/Cards";
import Filters from "@/components/Filters";
import { dummyLeanks } from "@/constants/data";
import { FilterOptions, Screens } from "@/constants/enums";
import { useGlobalContext } from "@/lib/GlobalContext";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Portal } from "@gorhom/portal";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { Alert, Platform, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<any>(null);

  const { showLoader, hideLoader } = useGlobalContext();

  const { categoryFilter, clickedFilter } = useLocalSearchParams<{
    categoryFilter?: string;
    clickedFilter?: FilterOptions;
  }>();

  useEffect(() => {
    console.log(clickedFilter);
    if (clickedFilter) {
      bottomSheetRef.current?.expand();
    }
  }, [clickedFilter]);

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
          onPress: () => {
            showLoader(undefined, true);
            setTimeout(hideLoader, 1500);
          },
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
        <View className="flex-1 px-5 pt-5">
          <View className="h-5/6 items-center">
            <View
              className={`rounded-3xl h-5 bg-white shadow-md ${Platform.OS === "ios" ? "shadow-slate-200" : "shadow-gray-300 "} absolute w-5/6 bottom-2`}
            />

            <LeankCardBig item={dummyLeanks[0]} />
          </View>

          <View className="flex-row gap-16 items-center justify-center flex-1">
            <TouchableOpacity
              activeOpacity={0.6}
              className="bg-white shadow-md rounded-full size-20  shadow-gray-300 items-center justify-center"
            >
              <Feather name="x" size={35} color="black" />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={onLikePress}
              className="bg-white shadow-md rounded-full size-20  shadow-gray-300 items-center justify-center"
            >
              <MaterialCommunityIcons name="heart" size={35} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
      <Portal>
        <FilterBottomSheet ref={bottomSheetRef} clickedFilter={clickedFilter} />
      </Portal>
    </GestureHandlerRootView>
  );
}
