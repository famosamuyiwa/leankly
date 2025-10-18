import { FilterOptions, Screens } from "@/constants/enums";
import { useGlobalContext } from "@/lib/GlobalContext";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity } from "react-native";
import { filterCategories } from "../constants/data";

const Filters = ({ screen }: { screen: Screens }) => {
  const router = useRouter();
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
  const [clickedFilter, setClickedFilter] = useState<string | undefined>(
    undefined
  );

  // Keep local state in sync if URL params change externally
  useEffect(() => {
    setSelectedCategories(initialSelected);
  }, [initialSelected]);

  const handleCategoryPress = (category: string) => {
    const exists = selectedCategories.includes(category);
    const next = exists
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];

    // 1️⃣ Update local state first
    setSelectedCategories(next);
    setClickedFilter(category);
  };

  // 2️⃣ Sync with router *after* render commits
  useEffect(() => {
    if (!clickedFilter) return;
    const query =
      selectedCategories.length > 0
        ? selectedCategories.map((c) => encodeURIComponent(c)).join(",")
        : undefined;

    // Safe: runs after render
    router.setParams({
      categoryFilter: query,
      clickedFilter,
    });
  }, [selectedCategories, clickedFilter]);

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
