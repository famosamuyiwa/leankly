import React, { useRef, useState } from "react";
import { TextInput, TouchableOpacity, View } from "react-native";

import { AntDesign, Feather } from "@expo/vector-icons";

const SearchBar = ({
  placeholder,
  className,
  onFocus,
  onBlur,
  value,
  onChangeText,
}: {
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  value?: string;
  onChangeText?: (text: string) => void;
}) => {
  const [search, setSearch] = useState(value || "");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleSearch = (text: string) => {
    if (value === undefined) setSearch(text);
    onChangeText?.(text);
  };

  const handleOnFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleOnBlur = () => {
    setIsFocused(false);
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
          value={value ?? search}
          onChangeText={handleSearch}
          placeholder={placeholder ?? "Search for anything"}
          placeholderTextColor={"#9CA3AF"}
          className="p-0 font-plus-jakarta-regular text-black-300 ml-2 flex-1"
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
