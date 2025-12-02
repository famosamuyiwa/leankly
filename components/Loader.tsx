import { Colors } from "@/constants/common";
import images from "@/constants/images";
import { Image } from "expo-image";
import Lottie from "lottie-react-native";
import { cssInterop } from "nativewind";
import React, { forwardRef, useImperativeHandle, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

const Loader = forwardRef(({}, ref) => {
  // Interop the Image component to recognize the 'className' prop
  cssInterop(Image, {
    className: { target: "style" },
  });

  const [visibility, setVisibility] = useState(false);
  const [label, setLabel] = useState("");
  const [pulse, setPulse] = useState(false);

  const show = (lab?: string, pul?: boolean) => {
    if (lab) setLabel(lab);
    if (pul) setPulse(pul);
    setVisibility(true);
  };

  const hide = () => {
    setVisibility(false);
    setPulse(false);
    setLabel("");
  };

  useImperativeHandle(
    ref,
    () => ({
      show: (lab?: string, pulse?: boolean) => show(lab, pulse),
      hide: () => hide(),
    }),
    [show, hide]
  );

  return (
    <>
      {visibility &&
        (Platform.OS === "android" ? (
          <View
            className={`w-full h-full absolute items-center justify-center ${pulse ? "bg-white" : "bg-black/50"} z-50`}
          >
            {pulse ? (
              <View className="items-center justify-center">
                <Image
                  source={images.whiteIcon}
                  className="absolute size-10  z-10"
                  contentFit="contain"
                />
                <Lottie
                  source={require("@/assets/animations/searching.json")}
                  loop={true}
                  autoPlay={true}
                  style={{
                    width: 120,
                    height: 120,
                  }}
                />
              </View>
            ) : (
              <View className=" bg-white rounded-xl p-5 flex-row items-center justify-center gap-5">
                <ActivityIndicator color={Colors.primary} size="small" />
                <Text className="font-plus-jakarta-semibold">
                  {label || "Please wait..."}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <Animated.View
            layout={LinearTransition}
            entering={FadeIn.duration(500)}
            exiting={FadeOut.duration(500)}
            className={`w-full h-full absolute items-center justify-center ${pulse ? "bg-white" : "bg-black/50"} z-50`}
          >
            {pulse ? (
              <View className="items-center justify-center">
                <Image
                  source={images.whiteIcon}
                  className="absolute size-10  z-10"
                  contentFit="contain"
                />
                <Lottie
                  source={require("@/assets/animations/searching.json")}
                  loop={true}
                  autoPlay={true}
                  style={{
                    width: 120,
                    height: 120,
                  }}
                />
              </View>
            ) : (
              <View className=" bg-white rounded-xl p-5 flex-row items-center justify-center gap-5">
                <ActivityIndicator color={Colors.primary} size="small" />
                <Text className="font-plus-jakarta-semibold">
                  {label || "Please wait..."}
                </Text>
              </View>
            )}
          </Animated.View>
        ))}
    </>
  );
});

export default Loader;
