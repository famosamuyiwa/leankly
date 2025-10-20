import { Colors } from "@/constants/common";
import React from "react";
import { Switch, Text, View } from "react-native";

export const ToggleItem = ({
  title,
  isToggleEnabled,
  setIsToggleEnabled,
}: {
  title: string;
  isToggleEnabled: boolean;
  setIsToggleEnabled: (toggle: boolean) => void;
}) => {
  const tabIconSelected = Colors.primary;

  const toggleSwitch = () => {
    setIsToggleEnabled(!isToggleEnabled);
  };

  return (
    <View className="flex justify-between items-center flex-row ">
      <Text className="font-plus-jakarta-regular">{title}</Text>
      <Switch
        trackColor={{ false: "#767577", true: tabIconSelected }}
        onValueChange={toggleSwitch}
        value={isToggleEnabled}
      />
    </View>
  );
};
