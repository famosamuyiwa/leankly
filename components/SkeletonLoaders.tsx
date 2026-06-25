import React, { useEffect } from "react";
import { View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

type SkeletonBlockProps = {
  className?: string;
  style?: ViewStyle;
};

type SkeletonListProps = {
  count?: number;
};

const PULSE_DURATION_MS = 900;

const SkeletonPulse = ({ children }: { children: React.ReactNode }) => {
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, {
        duration: PULSE_DURATION_MS,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={animatedStyle}
    >
      {children}
    </Animated.View>
  );
};

export const SkeletonBlock = ({ className, style }: SkeletonBlockProps) => {
  return <View className={`bg-gray-200 ${className || ""}`} style={style} />;
};

export const LeankCardSkeleton = () => {
  return (
    <SkeletonPulse>
      <View className="mx-5 mb-5 mt-4 overflow-hidden rounded-3xl bg-black/10">
        <View className="px-4 py-2">
          <SkeletonBlock className="h-3 w-2/5 rounded-full bg-gray-300" />
        </View>
        <View className="flex-row items-center gap-2 rounded-b-3xl bg-gray-100 px-4 py-4">
          <SkeletonBlock className="size-20 rounded-lg" />
          <View className="flex-1 gap-4">
            <View className="flex-row items-center justify-between">
              <SkeletonBlock className="size-4 rounded-full" />
              <SkeletonBlock className="h-4 w-32 rounded-full" />
            </View>
            <View className="flex-row items-center justify-between">
              <SkeletonBlock className="size-4 rounded-full" />
              <SkeletonBlock className="h-4 w-28 rounded-full" />
            </View>
          </View>
        </View>
      </View>
    </SkeletonPulse>
  );
};

export const ChatCardSkeleton = () => {
  return (
    <SkeletonPulse>
      <View className="mb-5 flex-row gap-5">
        <SkeletonBlock className="size-20 rounded-2xl" />
        <View className="flex-1 justify-center gap-3">
          <View className="flex-row items-center justify-between">
            <SkeletonBlock className="h-5 w-3/5 rounded-full" />
            <SkeletonBlock className="h-3 w-12 rounded-full" />
          </View>
          <SkeletonBlock className="h-4 w-4/5 rounded-full" />
        </View>
      </View>
    </SkeletonPulse>
  );
};

export const RequestCardSkeleton = () => {
  return (
    <SkeletonPulse>
      <View className="mb-5">
        <View className="mb-5 flex-row gap-5">
          <SkeletonBlock className="size-20 rounded-full" />
          <View className="flex-1 justify-center gap-3">
            <View className="flex-row items-center justify-between">
              <SkeletonBlock className="h-5 w-2/5 rounded-full" />
              <SkeletonBlock className="h-3 w-12 rounded-full" />
            </View>
            <SkeletonBlock className="h-4 w-4/5 rounded-full" />
          </View>
        </View>
        <View className="flex-row justify-between">
          <SkeletonBlock className="h-12 w-[47.5%] rounded-full" />
          <SkeletonBlock className="h-12 w-[47.5%] rounded-full" />
        </View>
      </View>
    </SkeletonPulse>
  );
};

export const LeankerRowSkeleton = () => {
  return (
    <SkeletonPulse>
      <View className="flex-row items-center justify-between py-1">
        <View className="flex-row items-center gap-5">
          <SkeletonBlock className="size-14 rounded-full" />
          <SkeletonBlock className="h-5 w-28 rounded-full" />
        </View>
        <SkeletonBlock className="h-4 w-14 rounded-full" />
      </View>
    </SkeletonPulse>
  );
};

export const LeankCardSkeletonList = ({ count = 4 }: SkeletonListProps) => {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <LeankCardSkeleton key={`leank-card-skeleton-${index}`} />
      ))}
    </View>
  );
};

export const LeankerRowSkeletonList = ({ count = 4 }: SkeletonListProps) => {
  return (
    <View className="gap-5">
      {Array.from({ length: count }).map((_, index) => (
        <LeankerRowSkeleton key={`leanker-row-skeleton-${index}`} />
      ))}
    </View>
  );
};

export const ChatCardSkeletonList = ({ count = 6 }: SkeletonListProps) => {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <ChatCardSkeleton key={`chat-card-skeleton-${index}`} />
      ))}
    </View>
  );
};

export const RequestCardSkeletonList = ({ count = 4 }: SkeletonListProps) => {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <RequestCardSkeleton key={`request-card-skeleton-${index}`} />
      ))}
    </View>
  );
};
