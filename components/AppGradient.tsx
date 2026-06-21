import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ColorValue, View } from "react-native";

type GradientColors = readonly [ColorValue, ColorValue, ...ColorValue[]];

export const AppGradient = ({
  children,
  colors,
  style,
}: {
  children: any;
  colors: GradientColors;
  style?: any;
}) => {
  return (
    <LinearGradient
      colors={colors}
      style={{ flex: 1, width: "100%", ...style }}
    >
      <View className="flex-1 px-5">{children}</View>
    </LinearGradient>
  );
};

export const AppGradientRounded = ({
  children,
  colors,
}: {
  children: any;
  colors: GradientColors;
}) => {
  return (
    <LinearGradient colors={colors} className={"flex-1 rounded-full"}>
      <View className="flex-1 px-5">{children}</View>
    </LinearGradient>
  );
};

export const AppGradientMessage = ({
  children,
  colors,
}: {
  children: any;
  colors: GradientColors;
}) => {
  return (
    <LinearGradient
      colors={colors}
      className={"flex-1 rounded-t-full rounded-bl-full"}
    >
      <View className="flex-1 px-5">{children}</View>
    </LinearGradient>
  );
};
