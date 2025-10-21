import { FilterOptions, Screens } from "@/constants/enums";
import { useFiltersContext } from "@/lib/FiltersContext";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet from "@gorhom/bottom-sheet";
import { Portal } from "@gorhom/portal";
import React, { useRef } from "react";
import { ScrollView, Text, TouchableOpacity } from "react-native";
import { filterCategories } from "../constants/data";
import { FilterBottomSheet } from "./BottomSheet";

const Filters = ({ screen }: { screen: Screens }) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { filters, setFilter, setPendingFilter } = useFiltersContext();

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
                onPress={() => handleChipPress(item.title, isSheetFilter)}
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
                {isSheetFilter && (
                  <Ionicons
                    name="chevron-down"
                    size={14}
                    color={isSelected ? "white" : "black"}
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
