import { Colors } from "@/constants/common";
import { useCallback, useMemo, useState } from "react";
import { View, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

const DEFAULT_THUMB_SIZE = 24;
const DEFAULT_TRACK_HEIGHT = 4;
const HORIZONTAL_PADDING = 15;

type SingleSliderProps = {
  min: number;
  max: number;
  value: number;
  step?: number;
  width?: number;
  thumbSize?: number;
  trackHeight?: number;
  selectedTrackStyle?: ViewStyle;
  unselectedTrackStyle?: ViewStyle;
  thumbStyle?: ViewStyle;
  onValueChange: (value: number) => void;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const snapToStep = (value: number, step: number) =>
  Math.round(value / step) * step;

export const SingleSlider = ({
  min,
  max,
  value,
  step = 1,
  width,
  thumbSize = DEFAULT_THUMB_SIZE,
  trackHeight = DEFAULT_TRACK_HEIGHT,
  selectedTrackStyle,
  unselectedTrackStyle,
  thumbStyle,
  onValueChange,
}: SingleSliderProps) => {
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const rootWidth = width ?? measuredWidth;
  const trackWidth = useMemo(() => {
    if (width != null) return width;

    return Math.max(0, measuredWidth - HORIZONTAL_PADDING * 2);
  }, [measuredWidth, width]);
  const range = max - min;
  const clampedValue = clamp(value, min, max);
  const progress = useSharedValue(range ? (clampedValue - min) / range : 0);
  const dragStartProgress = useSharedValue(0);

  const progressToValue = useCallback(
    (nextProgress: number) => {
      const rawValue = min + clamp(nextProgress, 0, 1) * range;
      return clamp(snapToStep(rawValue, step), min, max);
    },
    [max, min, range, step],
  );

  const handleProgressChange = useCallback(
    (nextProgress: number) => {
      onValueChange(progressToValue(nextProgress));
    },
    [onValueChange, progressToValue],
  );

  const panGesture = Gesture.Pan()
    .hitSlop({ top: 20, bottom: 20, left: 20, right: 20 })
    .onBegin(() => {
      dragStartProgress.value = progress.value;
    })
    .onUpdate((event) => {
      if (!trackWidth) return;

      const nextProgress =
        dragStartProgress.value + event.translationX / trackWidth;
      const clampedProgress = Math.min(1, Math.max(0, nextProgress));

      progress.value = clampedProgress;
      runOnJS(handleProgressChange)(clampedProgress);
    });

  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd((event) => {
      if (!trackWidth) return;

      const clampedProgress = Math.min(
        1,
        Math.max(0, (event.x - HORIZONTAL_PADDING) / trackWidth),
      );

      progress.value = clampedProgress;
      runOnJS(handleProgressChange)(clampedProgress);
    });

  const composedGesture = Gesture.Simultaneous(tapGesture, panGesture);

  const fillStyle = useAnimatedStyle(() => ({
    width: trackWidth * progress.value,
  }));

  const animatedThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: trackWidth * progress.value }],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <View
        style={{
          alignSelf: "center",
          direction: "ltr",
          height: 50,
          justifyContent: "center",
          width: width != null ? rootWidth + HORIZONTAL_PADDING * 2 : "100%",
        }}
        onLayout={(event) => setMeasuredWidth(event.nativeEvent.layout.width)}
      >
        <View
          style={[
            {
              backgroundColor: "#ccc",
              height: trackHeight,
              left: HORIZONTAL_PADDING,
              position: "absolute",
              width: trackWidth,
            },
            unselectedTrackStyle,
          ]}
        />
        <Animated.View
          style={[
            {
              backgroundColor: Colors.primary,
              height: trackHeight,
              left: HORIZONTAL_PADDING,
              position: "absolute",
            },
            selectedTrackStyle,
            fillStyle,
          ]}
        />
        <Animated.View
          style={[
            {
              alignItems: "center",
              backgroundColor: "#fff",
              borderRadius: thumbSize / 2,
              elevation: 3,
              height: thumbSize,
              justifyContent: "center",
              left: HORIZONTAL_PADDING - thumbSize / 2,
              position: "absolute",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              top: "50%",
              width: thumbSize,
              marginTop: -(thumbSize / 2),
            },
            thumbStyle,
            animatedThumbStyle,
          ]}
        />
      </View>
    </GestureDetector>
  );
};
