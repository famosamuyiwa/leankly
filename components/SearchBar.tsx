import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
import { useDebouncedCallback } from "use-debounce";

import { AntDesign, Feather } from "@expo/vector-icons";

const SearchBar = ({
  placeholder,
  className,
  onFocus,
  onBlur,
}: {
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}) => {
  const params = useLocalSearchParams<{ query?: string }>();
  const [search, setSearch] = useState(params.query);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const debouncedSearch = useDebouncedCallback((text: string) => {
    router.setParams({ query: text });
  }, 500);

  const handleSearch = (text: string) => {
    setSearch(text);
    debouncedSearch(text);
  };

  const handleOnFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleOnBlur = () => {
    setIsFocused(false);
    setSearch("");
    router.setParams({ query: "" });
    inputRef.current?.blur();
    onBlur?.();
  };

  return (
    <View
      className={`flex flex-row items-center justify-between w-full px-4 rounded-full  py-4 border border-gray-200 mt-5 ${className}`}
    >
      <View className="flex-1 flex flex-row  justify-center z-50">
        <Feather name="search" size={20} color="#9CA3AF" />
        <TextInput
          ref={inputRef}
          value={search}
          onChangeText={handleSearch}
          placeholder={placeholder ?? "Search for anything"}
          placeholderTextColor={"#9CA3AF"}
          className=" font-plus-jakarta-regular text-black-300 ml-2 flex-1"
          onFocus={handleOnFocus}
        />

        {isFocused && (
          <TouchableOpacity onPress={handleOnBlur}>
            <AntDesign name="close-circle" size={20} color="grey" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default SearchBar;
