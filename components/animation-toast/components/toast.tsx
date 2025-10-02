import { StyleSheet, Text, View } from "react-native";
import React, {
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withDelay,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getStyles } from "../utils";
import { MaterialIcons } from "@expo/vector-icons";
import { ToastProps } from "@/interfaces";

const Toast = forwardRef(({}, ref) => {
  const toastTopAnimation = useSharedValue(-100);
  const [state, setState] = useState({
    title: "",
    isShow: false,
    type: "",
    description: "",
  });

  const updateState = (newState: object) => {
    setState((prevState: any) => ({
      ...prevState,
      ...newState,
    }));
  };

  const insets = useSafeAreaInsets();
  const { backgroundColor, descriptionColor, animationIcon } = getStyles(
    state.type
  );

  const show = useCallback(
    ({ description, type, duration = 2000 }: ToastProps) => {
      updateState({
        isShow: true,
        description,
        type,
      });
      toastTopAnimation.value = withSequence(
        withTiming(Math.max(Number(insets?.top), 15)),
        withDelay(
          duration,
          withTiming(-100, undefined, (finish) => {
            if (finish) {
              runOnJS(() => {
                updateState({
                  isShow: false,
                });
              });
            }
          })
        )
      );
    },
    [insets, toastTopAnimation]
  );

  useImperativeHandle(
    ref,
    () => ({
      show: (props: ToastProps) => show(props),
    }),
    [show]
  );
  const animatedTopStyles = useAnimatedStyle(() => {
    return {
      top: toastTopAnimation.value,
    };
  });

  return (
    <>
      {state.isShow && (
        <Animated.View
          style={[
            styles.toastContainer,
            { backgroundColor },
            animatedTopStyles,
          ]}
        >
          {animationIcon && (
            <MaterialIcons
              name={animationIcon}
              color={descriptionColor}
              size={30}
            />
          )}
          <View style={styles.descriptionCard}>
            {state.description && (
              <Text
                className="font-plus-jakarta-regular"
                style={[styles.description, { color: descriptionColor }]}
              >
                {state.description}
              </Text>
            )}
          </View>
        </Animated.View>
      )}
    </>
  );
});

export default Toast;

const styles = StyleSheet.create({
  toastContainer: {
    width: "90%",
    height: 50,
    position: "absolute",
    top: 0,
    paddingVertical: 8,
    paddingHorizontal: 25,
    marginHorizontal: 15,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    flex: 1,
    shadowColor: "black",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 6,
  },

  descriptionCard: {
    flexDirection: "column",
    alignItems: "center",
    marginHorizontal: 5,
    paddingHorizontal: 10,
  },
  description: {
    fontSize: 12,
    fontWeight: "500",
  },
  icon: {
    width: 30,
    height: 30,
  },
});
