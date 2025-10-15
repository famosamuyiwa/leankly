import { FilterOptions, Screens } from "@/constants/enums";
import { useGlobalContext } from "@/lib/GlobalContext";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity } from "react-native";
import { filterCategories } from "../constants/data";

const Filters = ({ screen }: { screen: Screens }) => {
  const params = useLocalSearchParams<{ categoryFilter?: string }>();
  const { alertComingSoon } = useGlobalContext();

  const initialSelected = useMemo(() => {
    if (params.categoryFilter && typeof params.categoryFilter === "string") {
      return params.categoryFilter
        .split(",")
        .map((s) => decodeURIComponent(s))
        .filter(Boolean);
    }
    return screen === Screens.HOME ? ["Today"] : [];
  }, [params.categoryFilter, screen]);

  const [selectedCategories, setSelectedCategories] =
    useState<string[]>(initialSelected);

  // Keep local state in sync if URL params change externally
  useEffect(() => {
    setSelectedCategories(initialSelected);
  }, [initialSelected]);

  const handleCategoryPress = (category: string) => {
    // if (category !== FilterOptions.TODAY) return alertComingSoon();
    setSelectedCategories((prev) => {
      const exists = prev.includes(category);
      const next = exists
        ? prev.filter((c) => c !== category)
        : [...prev, category];
      // Update URL params as comma-separated list (remove when empty)
      router.setParams({
        categoryFilter: next.length
          ? next.map((c) => encodeURIComponent(c)).join(",")
          : (undefined as any),
        clickedFilter: category,
      });
      return next;
    });
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mt-3 mb-2"
    >
      {filterCategories
        .filter((category) => category.screen === screen)
        .map((item, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleCategoryPress(item.title)}
            className={`flex-row items-center gap-2 mr-4 px-4 py-2 rounded-full ${
              selectedCategories.includes(item.title)
                ? "bg-primary-300"
                : "bg-primary-100 border border-primary-200"
            }`}
          >
            <Text
              className={`text-sm ${
                selectedCategories.includes(item.title)
                  ? "text-white font-plus-jakarta-bold mt-0.5"
                  : "text-black-300 font-plus-jakarta-regular"
              }`}
            >
              {item.title}
            </Text>
            {!(item.title === FilterOptions.TODAY) && (
              <Ionicons
                name="chevron-down"
                size={14}
                color={`${selectedCategories.includes(item.title) ? "white" : "black"}`}
              />
            )}
          </TouchableOpacity>
        ))}
    </ScrollView>
  );
};

export default Filters;
