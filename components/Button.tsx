import React from "react";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";

const CustomButton = ({
  label,
  onPress,
  isLoading,
  isDisabled,
}: {
  label: string;
  onPress: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
}) => {
  const handleOnPress = () => {
    if (isLoading) return;

    onPress();
  };
  return (
    <>
      {!isDisabled && (
        <TouchableOpacity
          onPress={handleOnPress}
          className={`items-center justify-center bg-primary-300 shadow-md shadow-zinc-400"
       rounded-full py-3 h-12`}
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

      {isDisabled && (
        <TouchableOpacity
          onPress={handleOnPress}
          className={`items-center justify-center bg-gray-300 rounded-full py-3 h-12`}
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
