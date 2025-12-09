import { Colors } from "@/constants/common";
import { FilterOptions, Screens } from "@/constants/enums";
import { useFiltersContext } from "@/lib/FiltersContext";
import { usePremium } from "@/lib/PremiumContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import BottomSheet from "@gorhom/bottom-sheet";
import { Portal } from "@gorhom/portal";
import React, { useEffect, useMemo, useRef } from "react";
import { ScrollView, Text, TouchableOpacity } from "react-native";
import { filterCategories } from "../constants/data";
import { FilterBottomSheet } from "./BottomSheet";

const Filters = ({ screen }: { screen: Screens }) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { filters, setFilter, setPendingFilter, clearFilter } =
    useFiltersContext();
  const { isPro, openPaywall } = usePremium();

  const screenFilters = useMemo(
    () => filterCategories.filter((category) => category.screen === screen),
    [screen]
  );

  const lockedKeys = useMemo(
    () =>
      screenFilters
        .filter((item) => item.requiresPro)
        .map((item) => item.title),
    [screenFilters]
  );

  const isLocked = (filterKey: FilterOptions) =>
    screen === Screens.HOME && lockedKeys.includes(filterKey) && !isPro;

  const handleChipPress = (
    filterKey: FilterOptions,
    isBottomSheetFilter: boolean
  ) => {
    if (isBottomSheetFilter) {
      const existingValue = filters[filterKey];
      const defaultValue =
        filterKey === FilterOptions.CATEGORY ? [] : null;
      setPendingFilter(filterKey, existingValue ?? defaultValue);
      bottomSheetRef.current?.expand();
    } else {
      // 👇 Toggle instantly
      const isActive = filters[filterKey];
      setFilter(filterKey, !isActive);
    }
  };

  // Gated press handler: only Location is available on Home for free users
  const onFilterPress = (
    filterKey: FilterOptions,
    isBottomSheetFilter: boolean
  ) => {
    if (isLocked(filterKey)) {
      openPaywall("Advanced filters");
      return;
    }
    handleChipPress(filterKey, isBottomSheetFilter);
  };

  // Ensure free users can't keep other filters applied on Home
  useEffect(() => {
    if (screen !== Screens.HOME || isPro) return;
    lockedKeys.forEach((key) => {
      if (filters[key]) clearFilter(key);
    });
  }, [isPro, screen, lockedKeys, filters, clearFilter]);

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-3 mb-2"
      >
        {screenFilters.map((item) => {
          const value = filters[item.title];
          const isSelected = Array.isArray(value)
            ? value.length > 0
            : !!value;
          const isSheetFilter = item.opensBottomSheet;
          const locked = isLocked(item.title);

          return (
            <TouchableOpacity
              key={item.title}
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
                (locked ? (
                  <MaterialCommunityIcons
                    name="crown"
                    size={16}
                    color={Colors.accent}
                  />
                ) : (
                  <Ionicons
                    name="chevron-down"
                    size={14}
                    color={isSelected ? "white" : "black"}
                  />
                ))}
              {!isSheetFilter && locked && (
                <MaterialCommunityIcons
                  name="crown"
                  size={16}
                  color={Colors.accent}
                />
              )}
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
