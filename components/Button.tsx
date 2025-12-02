import React from "react";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";

const CustomButton = ({
  label,
  onPress,
  isLoading,
  isDisabled,
  textClassName,
  bgClassName,
}: {
  label: string;
  onPress: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
  textClassName?: string;
  bgClassName?: string;
}) => {
  const handleOnPress = () => {
    if (isLoading || isDisabled) return;

    onPress();
  };
  return (
    <>
      {!isDisabled && (
        <TouchableOpacity
          onPress={handleOnPress}
          activeOpacity={0.6}
          className={`items-center justify-center bg-black "
       rounded-full py-3 h-12 ${bgClassName}`}
        >
          {isLoading ? (
            <ActivityIndicator color={"white"} size="small" />
          ) : (
            <Text
              className={`text-white text-center font-plus-jakarta-bold ${textClassName}`}
            >
              {label}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {isDisabled && (
        <TouchableOpacity
          onPress={handleOnPress}
          activeOpacity={0.6}
          className={`items-center justify-center bg-gray-300 rounded-full py-3 h-12 `}
        >
          {isLoading ? (
            <ActivityIndicator color={"white"} size="small" />
          ) : (
            <Text className="text-white text-center font-plus-jakarta-bold">
              {label}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </>
  );
};

export default CustomButton;
