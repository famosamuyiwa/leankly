import { Colors } from "@/constants/common";
import { FilterOptions, Screens } from "@/constants/enums";
import { useFiltersContext } from "@/lib/FiltersContext";
import { usePremium } from "@/lib/PremiumContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import BottomSheet from "@gorhom/bottom-sheet";
import { Portal } from "@gorhom/portal";
import React, { useEffect, useRef } from "react";
import { ScrollView, Text, TouchableOpacity } from "react-native";
import { filterCategories } from "../constants/data";
import { FilterBottomSheet } from "./BottomSheet";

const Filters = ({ screen }: { screen: Screens }) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { filters, setFilter, setPendingFilter, clearFilter } =
    useFiltersContext();
  const { isPro, openPaywall } = usePremium();

  const handleChipPress = (
    filterKey: FilterOptions,
    isBottomSheetFilter: boolean
  ) => {
    if (isBottomSheetFilter) {
      setPendingFilter(filterKey, null);
      bottomSheetRef.current?.expand();
    } else {
      // 👇 Toggle instantly
      const isActive = filters[filterKey];
      setFilter(filterKey, !isActive);
    }
  };

  // Gated press handler: only TODAY is available on Home for free users
  const onFilterPress = (
    filterKey: FilterOptions,
    isBottomSheetFilter: boolean
  ) => {
    const isHome = screen === Screens.HOME;
    const isLocked = !isPro && isHome && filterKey !== FilterOptions.TODAY;
    if (isLocked) {
      openPaywall("Advanced filters");
      return;
    }
    handleChipPress(filterKey, isBottomSheetFilter);
  };

  // Ensure free users can't keep other filters applied on Home
  useEffect(() => {
    if (screen !== Screens.HOME || isPro) return;
    Object.keys(filters).forEach((key) => {
      if (key !== FilterOptions.TODAY && filters[key]) {
        clearFilter(key);
      }
    });
  }, [isPro, screen]);

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-3 mb-2"
      >
        {filterCategories
          .filter((category) => category.screen === screen)
          .map((item, index) => {
            const isSelected = !!filters[item.title];
            const isSheetFilter = item.opensBottomSheet; // define this in your filterCategories

            return (
              <TouchableOpacity
                key={index}
                onPress={() => onFilterPress(item.title, isSheetFilter)}
                className={`flex-row items-center gap-2 mr-4 px-4 py-2 rounded-full ${
                  isSelected
                    ? "bg-primary-300"
                    : "bg-primary-100 border border-primary-200"
                }`}
              >
                <Text
                  className={`text-sm ${
                    isSelected
                      ? "text-white font-plus-jakarta-bold mt-0.5"
                      : "text-black-300 font-plus-jakarta-regular"
                  }`}
                >
                  {item.title}
                </Text>
                {isSheetFilter &&
                  (isPro ? (
                    <Ionicons
                      name="chevron-down"
                      size={14}
                      color={isSelected ? "white" : "black"}
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name="crown"
                      size={16}
                      color={Colors.accent}
                    />
                  ))}
              </TouchableOpacity>
            );
          })}
      </ScrollView>

      <Portal>
        <FilterBottomSheet ref={bottomSheetRef} />
      </Portal>
    </>
  );
};

export default Filters;
