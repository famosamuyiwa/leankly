import { ResizeMode, Video } from "expo-av";
import { Image } from "expo-image";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import GradientText from "@/components/GradientText";
import { LoginProvider } from "@/constants/enums";
import icons from "@/constants/icons";
import images from "@/constants/images";
import { useGoogleSSO } from "@/hooks/useGoogleSignIn";
import { useWarmUpBrowser } from "@/hooks/useWarmUpBrowser";
import {
  AntDesign,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";

const SignIn = () => {
  useWarmUpBrowser();

  const { signInWithGoogle } = useGoogleSSO();

  const handleLogin = async (provider: LoginProvider) => {
    switch (provider) {
      case LoginProvider.GOOGLE:
        signInWithGoogle();
        break;
      case LoginProvider.APPLE:
        break;
      case LoginProvider.MAIL:
        router.navigate("/mail-auth");
        break;
      default:
        Alert.alert("Error", "Invalid login provider");
    }
  };

  return (
    <View style={styles.container}>
      <Video
        source={require("@/assets/videos/auth_playback.mp4")}
        style={styles.backgroundVideo}
        resizeMode={ResizeMode.COVER}
        isMuted
        shouldPlay
        isLooping
        useNativeControls={false}
      />
      <View pointerEvents="none" style={styles.overlay} />

      <Animated.View
        layout={LinearTransition}
        entering={FadeIn.duration(500)}
        className="h-full p-10 justify-between"
        style={styles.content}
      >
        <View className="items-center p-10">
          <Image
            source={images.whiteIcon}
            className=" size-10  "
            contentFit="contain"
          />
        </View>
        <View>
          <GradientText className="text-xl text-center font-plus-jakarta-semibold">
            Leankly
          </GradientText>
          <Text className="text-3xl font-plus-jakarta-bold text-white text-center mt-2">
            Side Questing For
          </Text>
          <View className="flex-row justify-center items-center">
            <MaterialCommunityIcons
              name="star-four-points-small"
              color="gold"
              size={40}
            />
            <Text className="text-3xl font-plus-jakarta-bold text-primary-300 ">
              The Plot
            </Text>
            <MaterialCommunityIcons
              name="star-four-points-small"
              color="gold"
              size={40}
            />
          </View>

          <TouchableOpacity
            onPress={() => handleLogin(LoginProvider.GOOGLE)}
            className="bg-white rounded-full w-full py-4 mt-5 items-center"
          >
            <View className="flex flex-row items-center gap-2 w-8/12">
              <Image
                source={icons.google}
                style={styles.googleImg}
                contentFit="contain"
              />
              <Text className="text-lg font-plus-jakarta-medium text-black-300 ml-2">
                Continue with Google
              </Text>
            </View>
          </TouchableOpacity>
          {Platform.OS === "ios" && (
            <TouchableOpacity
              onPress={() => handleLogin(LoginProvider.APPLE)}
              className="bg-white rounded-full w-full py-4 mt-5 items-center"
            >
              <View className="flex flex-row items-center gap-2 w-8/12">
                <AntDesign name="apple" size={24} />
                <Text className="text-lg font-plus-jakarta-medium text-black-300 ml-1">
                  Continue with Apple
                </Text>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => handleLogin(LoginProvider.MAIL)}
            className="bg-white rounded-full w-full py-4 mt-5 items-center"
          >
            <View className="flex flex-row items-center gap-2  w-8/12">
              <Ionicons name="mail" size={22} />
              <Text className="text-lg font-plus-jakarta-medium text-black-300 ml-2">
                Continue with Mail
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  backgroundVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 32,
  },
  googleImg: {
    width: 20,
    height: 20,
  },
});

export default SignIn;
