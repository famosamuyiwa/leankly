import { Colors } from "@/constants/common";
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

export const SelectItem = ({
  label,
  isSelected,
  onPress,
}: {
  label: string;
  isSelected?: boolean;
  onPress: () => void;
}) => {
  return (
    <View className="flex justify-between items-center flex-row ">
      <Text className="font-plus-jakarta-regular">{label}</Text>
      <TouchableOpacity activeOpacity={0.6} onPress={onPress}>
        {isSelected && (
          <MaterialIcons name="check-box" size={24} color={Colors.primary} />
        )}
        {!isSelected && (
          <MaterialIcons
            name="check-box-outline-blank"
            size={24}
            color="lightgrey"
          />
        )}
      </TouchableOpacity>
    </View>
  );
};
