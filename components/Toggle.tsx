import { Colors } from "@/constants/common";
import React, { useState } from "react";
import { Switch, Text, View } from "react-native";

export const ToggleItem = ({ title }: { title: string }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const tabIconSelected = Colors.primary;

  const toggleSwitch = () => {
    setIsEnabled(!isEnabled);
  };

  return (
    <View className="flex justify-between items-center flex-row ">
      <Text className="font-plus-jakarta-regular">{title}</Text>
      <Switch
        trackColor={{ false: "#767577", true: tabIconSelected }}
        onValueChange={toggleSwitch}
        value={isEnabled}
      />
    </View>
  );
};
