import { Image } from "expo-image";
import {
  Alert,
  Platform,
  ScrollView,
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
    <Animated.View
      layout={LinearTransition}
      entering={FadeIn.duration(500)}
      className="bg-white h-full"
    >
      <ScrollView contentContainerClassName="h-full">
        <Image
          source={images.onboarding}
          style={styles.onboardImg}
          contentFit="contain"
        />
        <View className="px-10">
          <GradientText className="text-xl text-center font-plus-jakarta-semibold">
            Leankly
          </GradientText>
          <Text className="text-3xl font-plus-jakarta-bold text-black-300 text-center mt-2">
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
            className="bg-white shadow-md shadow-zinc-300 rounded-full w-full py-4 mt-5 items-center"
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
              className="bg-white shadow-md shadow-zinc-300 rounded-full w-full py-4 mt-5 items-center"
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
            className="bg-white shadow-md shadow-zinc-300 rounded-full w-full py-4 mt-5 items-center"
          >
            <View className="flex flex-row items-center gap-2  w-8/12">
              <Ionicons name="mail" size={22} />
              <Text className="text-lg font-plus-jakarta-medium text-black-300 ml-2">
                Continue with Mail
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  onboardImg: {
    width: "100%",
    height: "55%",
  },
  googleImg: {
    width: 20,
    height: 20,
  },
});

export default SignIn;
