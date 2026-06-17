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

  const buttonClassName = isDisabled
    ? "bg-gray-300"
    : bgClassName || "bg-black";
  const indicatorColor = isDisabled ? "white" : "white";

  return (
    <TouchableOpacity
      onPress={handleOnPress}
      activeOpacity={0.6}
      disabled={isLoading || isDisabled}
      className={`items-center justify-center rounded-full py-3 h-12 ${buttonClassName}`}
    >
      {isLoading ? (
        <ActivityIndicator color={indicatorColor} size="small" />
      ) : (
        <Text
          className={`text-white text-center font-plus-jakarta-bold ${textClassName || ""}`}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default CustomButton;
