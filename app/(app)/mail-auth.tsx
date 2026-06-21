import CustomButton from "@/components/Button";
import { Colors } from "@/constants/common";
import { Screens, ToastType } from "@/constants/enums";
import { useGlobalContext } from "@/lib/GlobalContext";
import { useAuthSession } from "@/lib/auth/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const SignInMailScreen = () => {
  const insets = useSafeAreaInsets();
  const {
    loginWithEmail,
    signUpWithEmail,
    resendEmailOtp,
    verifyEmailOtp,
    requestPasswordRecovery,
  } = useAuthSession();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpUserId, setOtpUserId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentScreen, setCurrentScreen] = useState(Screens.LOGIN_1);
  const tint = Colors.primary;
  const color = Colors.primary;
  const secColor = Colors.primaryLight;
  const borderColor = Colors.primary;

  const { displayToast } = useGlobalContext();

  const showScreen = (screen: Screens) => {
    setIsLoading(false);
    setEmail("");
    setName("");
    setPassword("");
    setConfirmPassword("");
    setOtp("");
    setOtpUserId("");
    setCurrentScreen(screen);
  };

  if (!insets) {
    return null; // Prevents glitching by waiting for insets
  }

  //function to run when button is clicked
  function onButtonClick() {
    setIsLoading(true);

    switch (currentScreen) {
      case Screens.LOGIN_1:
        onHandleLogin();
        break;
      case Screens.SIGNUP_1:
        onHandleSignup();
        break;
      case Screens.FORGOT_PASSWORD:
        onRequestRecovery();
        break;
      default:
        return;
    }
  }

  const onSettled = () => {
    setIsLoading(false);
  };

  async function onHandleLogin() {
    if (email === "" || password === "") {
      setIsLoading(false);
      return displayToast({
        type: ToastType.ERROR,
        description: `Please fill all the fields`,
      });
    }
    try {
      const challenge = await loginWithEmail({
        email: email.trim(),
        password,
      });
      if (challenge) {
        setOtpUserId(challenge.userId);
        setOtp("");
        setPassword("");
        setCurrentScreen(Screens.OTP);
        displayToast({
          type: ToastType.SUCCESS,
          description: "A six-digit code was sent to your email.",
        });
        return;
      }
      router.replace("/");
    } catch (err: any) {
      return displayToast({
        type: ToastType.ERROR,
        description: err?.message || "Unable to sign in",
      });
    } finally {
      onSettled();
    }
  }

  async function onHandleSignup() {
    if (
      name === "" ||
      email === "" ||
      password === "" ||
      confirmPassword === ""
    ) {
      setIsLoading(false);
      return displayToast({
        type: ToastType.ERROR,
        description: "Please fill all the fields",
      });
    }
    if (password !== confirmPassword) {
      setIsLoading(false);
      return displayToast({
        type: ToastType.ERROR,
        description: `Password fields do not match`,
      });
    }
    try {
      const challenge = await signUpWithEmail({
        email: email.trim(),
        password,
        name: name.trim(),
      });
      setOtpUserId(challenge.userId);
      setOtp("");
      setPassword("");
      setConfirmPassword("");
      setCurrentScreen(Screens.OTP);
      displayToast({
        type: ToastType.SUCCESS,
        description: "A six-digit code was sent to your email.",
      });
    } catch (err: any) {
      return displayToast({
        type: ToastType.ERROR,
        description: err?.message || "Unable to create account",
      });
    } finally {
      onSettled();
    }
  }

  async function onRequestRecovery() {
    if (email === "") {
      setIsLoading(false);
      return displayToast({
        type: ToastType.ERROR,
        description: "Please enter your email",
      });
    }

    try {
      await requestPasswordRecovery(email);
      displayToast({
        type: ToastType.SUCCESS,
        description: "Password reset link sent to your email.",
      });
      showScreen(Screens.LOGIN_1);
    } catch (error: any) {
      return displayToast({
        type: ToastType.ERROR,
        description: error?.message || "Unable to send reset link",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onVerifyOtp() {
    if (!otpUserId || otp.length !== 6) {
      return displayToast({
        type: ToastType.ERROR,
        description: "Enter the six-digit code from your email.",
      });
    }

    setIsLoading(true);
    try {
      await verifyEmailOtp(otpUserId, otp);
      router.replace("/");
    } catch (error: any) {
      displayToast({
        type: ToastType.ERROR,
        description: error?.message || "Unable to verify the code",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onResendOtp() {
    if (!otpUserId || !email) return;

    setIsLoading(true);
    try {
      const challenge = await resendEmailOtp(email.trim(), otpUserId);
      setOtpUserId(challenge.userId);
      setOtp("");
      displayToast({
        type: ToastType.SUCCESS,
        description: "A new six-digit code was sent.",
      });
    } catch (error: any) {
      displayToast({
        type: ToastType.ERROR,
        description: error?.message || "Unable to resend the code",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Animated.View
      layout={LinearTransition}
      entering={FadeIn.duration(500)}
      style={templateStyles.wrapper}
    >
      {/*------------------LOGIN PAGE------------------------*/}
      {currentScreen === Screens.LOGIN_1 && (
        <Animated.View
          layout={LinearTransition}
          entering={FadeIn.duration(500)}
          className="flex-1"
        >
          <SafeAreaView style={styles.container4}>
            <View
              style={[
                styles.container3,
                { justifyContent: "flex-start", flexDirection: "row" },
              ]}
            >
              <Pressable onPress={() => router.dismissAll()}>
                <View style={[styles.backBtnBorder, { borderColor }]}>
                  <Ionicons
                    name="chevron-back"
                    style={{ color, fontSize: 25 }}
                  />
                </View>
              </Pressable>
            </View>
            <View style={styles.container2}>
              <Text className="font-plus-jakarta-bold" style={styles.heading}>
                Sign in to Leankly
              </Text>
              <Text
                className="font-plus-jakarta-regular"
                style={styles.subheading}
              >
                Enter your details
              </Text>
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 font-plus-jakarta-semibold mb-2">
                  Email
                </Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-4 border border-gray-200">
                  <Ionicons name="mail-outline" size={20} color={secColor} />
                  <TextInput
                    key={currentScreen}
                    value={email}
                    autoCapitalize="none"
                    placeholder="Enter your email"
                    placeholderTextColor="#9CA3AF"
                    onChangeText={setEmail}
                    className="p-0 flex-1 ml-3 text-gray-900 font-plus-jakarta-regular"
                    editable={!isLoading}
                  />
                </View>
              </View>
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 font-plus-jakarta-semibold mb-2">
                  Password
                </Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-4 border border-gray-200">
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={secColor}
                  />
                  <TextInput
                    key={currentScreen}
                    placeholder="Enter your password"
                    secureTextEntry={true}
                    value={password}
                    autoCapitalize="none"
                    placeholderTextColor="#9CA3AF"
                    onChangeText={setPassword}
                    className="p-0 flex-1 ml-3 text-gray-900 font-plus-jakarta-regular"
                    editable={!isLoading}
                  />
                </View>
              </View>
              <TouchableOpacity
                onPress={function () {
                  showScreen(Screens.FORGOT_PASSWORD);
                }}
              >
                <Text
                  style={{
                    color: tint,
                    fontSize: 15,
                  }}
                  className="font-plus-jakarta-regular"
                >
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </View>
            <View style={[templateStyles.buttonSize, { marginTop: 30 }]}>
              <CustomButton
                label="Sign in"
                onPress={onButtonClick}
                isLoading={isLoading}
                isDisabled={email === "" || password === ""}
              />
            </View>
            <View
              style={[
                styles.container2,
                {
                  marginBottom: 20,
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "flex-end",
                },
              ]}
            >
              <Text
                style={{
                  lineHeight: 20,
                  color: "darkgrey",
                  fontSize: 15,
                }}
                className="font-plus-jakarta-regular"
              >
                Don&apos;t have an account?
              </Text>
              <TouchableOpacity
                onPress={function () {
                  showScreen(Screens.SIGNUP_1);
                }}
              >
                <Text
                  style={{
                    lineHeight: 20,
                    color: tint,
                    fontSize: 15,
                  }}
                >
                  {" "}
                  Sign up
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      )}

      {/*------------------SIGNUP PAGE-------------------------*/}
      {currentScreen === Screens.SIGNUP_1 && (
        <Animated.View
          layout={LinearTransition}
          entering={FadeIn.duration(500)}
          className="flex-1"
        >
          <SafeAreaView style={styles.container4}>
            <View
              style={[
                styles.container3,
                { justifyContent: "flex-start", flexDirection: "row" },
              ]}
            >
              <Pressable onPress={() => router.dismissAll()}>
                <View style={[styles.backBtnBorder, { borderColor }]}>
                  <Ionicons
                    name="chevron-back"
                    style={{ color, fontSize: 25 }}
                  />
                </View>
              </Pressable>
            </View>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              keyboardVerticalOffset={20}
              style={{ width: "100%" }}
            >
              <View style={styles.container2}>
                <Text style={styles.heading} className="font-plus-jakarta-bold">
                  Sign up for Leankly
                </Text>
                <Text
                  style={styles.subheading}
                  className="font-plus-jakarta-semibold"
                >
                  Enter your details
                </Text>
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2 font-plus-jakarta-semibold">
                    Name
                  </Text>
                  <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-4 border border-gray-200">
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={secColor}
                    />
                    <TextInput
                      key={`${currentScreen}-name`}
                      value={name}
                      autoCapitalize="words"
                      placeholder="Enter your name"
                      placeholderTextColor="#9CA3AF"
                      onChangeText={setName}
                      className="p-0  flex-1 ml-3 text-gray-900"
                      editable={!isLoading}
                    />
                  </View>
                </View>
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2 font-plus-jakarta-semibold">
                    Email
                  </Text>
                  <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-4 border border-gray-200">
                    <Ionicons name="mail-outline" size={20} color={secColor} />
                    <TextInput
                      key={currentScreen}
                      value={email}
                      autoCapitalize="none"
                      placeholder="Enter your email"
                      placeholderTextColor="#9CA3AF"
                      onChangeText={setEmail}
                      className="p-0  flex-1 ml-3 text-gray-900"
                      editable={!isLoading}
                    />
                  </View>
                </View>
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2 font-plus-jakarta-semibold">
                    Password
                  </Text>
                  <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-4 border border-gray-200">
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={secColor}
                    />
                    <TextInput
                      key={currentScreen}
                      placeholder="Enter your password"
                      secureTextEntry={true}
                      value={password}
                      autoCapitalize="none"
                      placeholderTextColor="#9CA3AF"
                      onChangeText={setPassword}
                      className="p-0 flex-1 ml-3 text-gray-900"
                      editable={!isLoading}
                    />
                  </View>
                </View>
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2 font-plus-jakarta-semibold">
                    Confirm Password
                  </Text>
                  <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-4 border border-gray-200">
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={secColor}
                    />
                    <TextInput
                      key={currentScreen}
                      placeholder="Enter password again"
                      secureTextEntry={true}
                      value={confirmPassword}
                      autoCapitalize="none"
                      placeholderTextColor="#9CA3AF"
                      onChangeText={setConfirmPassword}
                      className="p-0 flex-1 ml-3 text-gray-900"
                      editable={!isLoading}
                    />
                  </View>
                </View>
              </View>
            </KeyboardAvoidingView>
            <View style={styles.container2}>
              <View>
                <View style={[templateStyles.buttonSize, { marginTop: 30 }]}>
                  <CustomButton
                    label="Continue"
                    isLoading={isLoading}
                    onPress={function () {
                      onButtonClick();
                    }}
                    isDisabled={
                      name === "" ||
                      email === "" ||
                      password === "" ||
                      confirmPassword === ""
                    }
                  />
                </View>
                <Text
                  style={{
                    lineHeight: 20,
                    color: "darkgrey",
                    fontSize: 13,
                  }}
                  className="font-plus-jakarta-regular"
                >
                  By signing up, you agree to our
                  <Text style={{ color: tint, fontSize: 13 }}>
                    {" "}
                    Privacy policy
                  </Text>{" "}
                  and
                  <Text style={{ color: tint, fontSize: 13 }}>
                    {" "}
                    Terms of Service
                  </Text>
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.container2,
                {
                  marginBottom: 20,
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "flex-end",
                },
              ]}
            >
              <Text
                style={{
                  lineHeight: 20,
                  color: "darkgrey",
                  fontSize: 15,
                }}
                className="font-plus-jakarta-regular"
              >
                Already have an account?
              </Text>
              <TouchableOpacity
                onPress={function () {
                  showScreen(Screens.LOGIN_1);
                }}
              >
                <Text
                  style={{
                    lineHeight: 20,
                    color: tint,
                    fontSize: 15,
                  }}
                >
                  {" "}
                  Log in
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      )}

      {/*--------------------------EMAIL OTP-------------------------------*/}
      {currentScreen === Screens.OTP && (
        <Animated.View
          layout={LinearTransition}
          entering={FadeIn.duration(500)}
          className="flex-1"
        >
          <SafeAreaView style={styles.container4}>
            <View
              style={[
                styles.container3,
                { justifyContent: "flex-start", flexDirection: "row" },
              ]}
            >
              <Pressable onPress={() => showScreen(Screens.LOGIN_1)}>
                <View style={[styles.backBtnBorder, { borderColor }]}>
                  <Ionicons
                    name="chevron-back"
                    style={{ color, fontSize: 25 }}
                  />
                </View>
              </Pressable>
            </View>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              keyboardVerticalOffset={20}
              style={styles.container2}
            >
              <Text className="font-plus-jakarta-bold" style={styles.heading}>
                Verify your email
              </Text>
              <Text
                className="font-plus-jakarta-regular"
                style={styles.otpDescription}
              >
                Enter the six-digit code sent to {email}. You can read the code
                on any device and enter it here.
              </Text>
              <TextInput
                value={otp}
                onChangeText={(value) =>
                  setOtp(value.replace(/\D/g, "").slice(0, 6))
                }
                autoFocus
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                keyboardType="number-pad"
                maxLength={6}
                editable={!isLoading}
                placeholder="000000"
                placeholderTextColor="#D1D5DB"
                accessibilityLabel="Six-digit email verification code"
                style={[styles.otpInput, { borderColor }]}
              />
              <View style={[templateStyles.buttonSize, { marginTop: 24 }]}>
                <CustomButton
                  label="Verify email"
                  onPress={onVerifyOtp}
                  isLoading={isLoading}
                  isDisabled={otp.length !== 6 || !otpUserId}
                />
              </View>
              <TouchableOpacity
                disabled={isLoading}
                onPress={onResendOtp}
                style={styles.resendButton}
              >
                <Text
                  className="font-plus-jakarta-semibold"
                  style={{ color: tint }}
                >
                  Resend code
                </Text>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Animated.View>
      )}

      {/*--------------------------FORGOT PASSWORD-------------------------------*/}
      {currentScreen === Screens.FORGOT_PASSWORD && (
        <Animated.View
          layout={LinearTransition}
          entering={FadeIn.duration(500)}
          className="flex-1"
        >
          <SafeAreaView style={styles.container4}>
            <View
              style={[
                styles.container3,
                { justifyContent: "flex-start", flexDirection: "row" },
              ]}
            >
              <Pressable
                onPress={function () {
                  showScreen(Screens.LOGIN_1);
                }}
              >
                <View style={[styles.backBtnBorder, { borderColor }]}>
                  <Ionicons
                    name="chevron-back"
                    style={{ color, fontSize: 25 }}
                  />
                </View>
              </Pressable>
            </View>
            <View style={styles.container2}>
              <View>
                <Text className="font-plus-jakarta-bold" style={styles.heading}>
                  Forgot Password?
                </Text>
                <Text
                  className="font-plus-jakarta-regular"
                  style={{ color: "darkgrey", marginTop: 10 }}
                >
                  Don&apos;t worry! It happens. Please enter the email
                  associated with this account
                </Text>
              </View>
              <View style={{ marginVertical: 30 }}>
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2 font-plus-jakarta-bold">
                    Email
                  </Text>
                  <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-4 border border-gray-200">
                    <Ionicons name="mail-outline" size={20} color={secColor} />
                    <TextInput
                      key={currentScreen}
                      value={email}
                      autoCapitalize="none"
                      placeholder="Enter your email"
                      placeholderTextColor="#9CA3AF"
                      onChangeText={setEmail}
                      className="p-0 flex-1 ml-3 text-gray-900"
                      editable={!isLoading}
                    />
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.container2}>
              <View style={templateStyles.buttonSize}>
                <CustomButton
                  label="Send link"
                  isLoading={isLoading}
                  onPress={function () {
                    onButtonClick();
                  }}
                  isDisabled={email === ""}
                />
              </View>
            </View>
          </SafeAreaView>
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 5,
    paddingTop: 50,
  },
  container2: {
    width: "100%",
  },
  container3: {
    width: "100%",
    paddingBottom: 25,
  },
  container4: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 5,
    paddingTop: 10,
  },
  icon: {
    fontSize: 25,
  },
  icon2: {
    fontSize: 20,
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: "100%",
  },
  separatorText: {
    paddingHorizontal: 10,
    position: "absolute",
    fontSize: 12,
  },
  separatorContainer: {
    width: "100%",
    height: 35,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnBorder: {
    padding: 5,
    borderWidth: 0.5,
    borderRadius: 10,
  },
  heading: {
    fontSize: 20,
  },
  subheading: {
    marginTop: 8,
    marginBottom: 30,
  },
  otpDescription: {
    color: "darkgrey",
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 32,
  },
  otpInput: {
    borderWidth: 1,
    borderRadius: 14,
    color: "#111827",
    fontSize: 30,
    letterSpacing: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    textAlign: "center",
    width: "100%",
  },
  resendButton: {
    alignItems: "center",
    paddingVertical: 14,
  },
});

const templateStyles = StyleSheet.create({
  buttonSize: {
    height: 50,
    width: "100%",
    marginVertical: 10,
  },
  wrapper: {
    width: "100%",
    height: "100%",
    paddingHorizontal: 20,
    backgroundColor: "white",
  },
  wrapper2: {
    width: "100%",
    height: "100%",
    paddingTop: 30,
  },
  wrapper3: {
    paddingTop: 40,
    paddingHorizontal: 10,
    flex: 1,
  },
  backBtnBorder: {
    padding: 5,
    borderWidth: 0.5,
    borderRadius: 10,
  },
  header: {
    fontSize: 25,
  },
  headerIconContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 10,
  },
});

export default SignInMailScreen;
