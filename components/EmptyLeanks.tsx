import CustomButton from "@/components/Button";
import GradientText from "@/components/GradientText";
import { mascotPoses } from "@/constants/data";
import images from "@/constants/images";
import { Image } from "expo-image";
import Lottie from "lottie-react-native";
import { cssInterop } from "nativewind";
import React from "react";
import { Text, View } from "react-native";

cssInterop(Image, {
  className: { target: "style" },
});

type Props = {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  onPrimaryAction?: () => void;
  primaryLabel?: string;
  isPulsing?: boolean;
  isMascotVisible?: boolean;
};

export default function EmptyLeanks({
  title = "No leanks right now",
  subtitle = "Try adjusting your filters or check back soon.",
  isMascotVisible = false,
  onRefresh,
  onPrimaryAction,
  primaryLabel,
  isPulsing = false,
}: Props) {
  return (
    <View className="w-full items-center px-8">
      {isPulsing && (
        <View className="items-center justify-center mb-6">
          <Image
            source={images.whiteIcon}
            className="absolute size-10 z-10"
            contentFit="contain"
          />
          <Lottie
            source={require("@/assets/animations/searching.json")}
            loop
            autoPlay
            style={{ width: 140, height: 140 }}
          />
        </View>
      )}

      {isMascotVisible && (
        <Image
          source={{ uri: mascotPoses.SMILE_THUMBS_UP }}
          className="h-60 w-full"
          contentFit="contain"
        />
      )}

      <GradientText
        style={{
          fontSize: 22,
          textAlign: "center",
          fontFamily: "PlusJakartaSans-SemiBold",
        }}
      >
        {title}
      </GradientText>

      <Text className="text-gray-500 text-center mt-2 leading-5">
        {subtitle}
      </Text>

      <View className="w-full gap-3 mt-6">
        {onPrimaryAction && primaryLabel && (
          <CustomButton
            label={primaryLabel}
            onPress={onPrimaryAction}
            bgClassName=""
            textClassName=""
          />
        )}

        {onRefresh && (
          <CustomButton
            label="Refresh"
            onPress={onRefresh}
            bgClassName="bg-gray-100"
            textClassName="text-black"
          />
        )}
      </View>
    </View>
  );
}
