import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import type { ColorValue } from "react-native";
import { StyleSheet, Text, TextProps, View } from "react-native";

type GradientColors = readonly [ColorValue, ColorValue, ...ColorValue[]];

interface GradientTextProps extends TextProps {
  children: string;
  colors?: GradientColors;
}

const DEFAULT_COLORS = [
  "#06b6d4",
  "#1CB0F7",
  "#FF5F6D",
  "#FF5F6D",
] as const satisfies GradientColors;

export default function GradientText({
  children,
  colors = DEFAULT_COLORS,
  style,
  ...textProps
}: GradientTextProps) {
  return (
    <MaskedView
      maskElement={
        <View style={styles.maskContainer}>
          <Text {...textProps} style={style}>
            {children}
          </Text>
        </View>
      }
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
      >
        {/* Invisible clone to give the gradient intrinsic size equal to the text */}
        <Text {...textProps} style={[style, styles.invisibleText]}>
          {children}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  maskContainer: {
    backgroundColor: "transparent",
  },
  invisibleText: {
    opacity: 0,
  },
});
