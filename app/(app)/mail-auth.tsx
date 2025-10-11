import CustomButton from "@/components/Button";
import OTPVerification from "@/components/Otp-verification";
import { Colors } from "@/constants/common";
import { Screens, ToastType } from "@/constants/enums";
import { useGlobalContext } from "@/lib/GlobalContext";
import { useSignIn, useSignUp } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
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
    isLoaded: isSignUpLoaded,
    signUp,
    setActive: setSignUpActive,
  } = useSignUp();
  const {
    isLoaded: isSignInLoaded,
    signIn,
    setActive: setSignInActive,
  } = useSignIn();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentScreen, setCurrentScreen] = useState(Screens.LOGIN_1);
  const [previousScreen, setPreviousScreen] = useState(Screens.LOGIN_1);
  const [isPasswordHidden, setIsPasswordHidden] = useState(true);
  const [isConfirmPasswordHidden, setIsConfirmPasswordHidden] = useState(true);
  const tint = Colors.primary;
  const color = Colors.primary;
  const secColor = Colors.primaryLight;
  const borderColor = Colors.primary;

  const { displayToast } = useGlobalContext();

  useEffect(
    function () {
      setIsLoading(false);
      if (
        currentScreen === Screens.LOGIN_1 ||
        currentScreen === Screens.SIGNUP_1 ||
        currentScreen === Screens.FORGOT_PASSWORD
      ) {
        setEmail("");
        setName("");
        setPassword("");
        setConfirmPassword("");
        setIsPasswordHidden(true);
        setIsConfirmPasswordHidden(true);
      }
    },
    [currentScreen]
  );

  if (!insets) {
    return null; // Prevents glitching by waiting for insets
  }

  //function to run when button is clicked
  function onButtonClick(otp?: string) {
    setIsLoading(true);

    switch (currentScreen) {
      case Screens.LOGIN_1:
        onHandleLogin();
        break;
      case Screens.SIGNUP_1:
        onHandleSignup();
        break;
      case Screens.OTP:
        if (otp) onVerifyOtp(otp);
        break;
      case Screens.FORGOT_PASSWORD:
        onVerifyEmail(Screens.RESET_PASSWORD);
        break;
      case Screens.RESET_PASSWORD:
        onHandleResetPassword();
        break;
      default:
        return;
    }
  }

  const onSettled = () => {
    setIsLoading(false);
  };

  async function onHandleLogin() {
    if (!isSignInLoaded) return;
    if (email === "" || password === "") {
      setIsLoading(false);
      return displayToast({
        type: ToastType.ERROR,
        description: `Please fill all the fields`,
      });
    }
    try {
      const signInAttempt = await signIn.create({
        identifier: email,
        password,
      });

      // If sign-in process is complete, set the created session as active
      // and redirect the user
      if (signInAttempt.status === "complete") {
        await setSignInActive({ session: signInAttempt.createdSessionId });
        router.replace("/");
      } else {
        // If the status isn't complete, check why. User might need to
        // complete further steps.
        console.error(JSON.stringify(signInAttempt, null, 2));
      }
    } catch (err: any) {
      return displayToast({
        type: ToastType.ERROR,
        description: err.message,
      });
    } finally {
      onSettled();
    }
  }

  async function onVerifyEmail(source: Screens) {
    if (source === Screens.SIGNUP_1) {
      try {
        // const response: ApiResponse = await verifyUserByEmail(email);
        // if (response.code === HttpStatusCode.NotFound) {
        //   setCurrentScreen(Screens.OTP);
        //   setPreviousScreen(Screens.SIGNUP_1);
        // } else {
        //   return displayToast({
        //     type: ToastType.ERROR,
        //     description: response.message,
        //   });
        // }
      } catch (error: any) {
        return displayToast({
          type: ToastType.ERROR,
          description: error.message,
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      try {
        // const response: ApiResponse = await verifyUserByEmail(email);
        // if (response.code === HttpStatusCode.Ok) {
        //   setCurrentScreen(Screens.OTP);
        //   setPreviousScreen(Screens.LOGIN_1);
        // } else {
        //   return displayToast({
        //     type: ToastType.ERROR,
        //     description: "User with email does not exist",
        //   });
        // }
      } catch (error: any) {
        return displayToast({
          type: ToastType.ERROR,
          description: error.message,
        });
      } finally {
        setIsLoading(false);
      }
    }
  }

  async function onVerifyOtp(otp: string) {
    if (!isSignUpLoaded) return;
    setIsLoading(true);

    try {
      // Use the code the user provided to attempt verification
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code: otp,
      });

      // If verification was completed, set the session to active
      // and redirect the user
      if (signUpAttempt.status === "complete") {
        await setSignUpActive({ session: signUpAttempt.createdSessionId });
        router.replace("/");
      } else {
        // If the status is not complete, check why. User may need to
        // complete further steps.
        console.error(JSON.stringify(signUpAttempt, null, 2));
      }
    } catch (error: any) {
      return displayToast({
        type: ToastType.ERROR,
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onHandleSignup() {
    if (!isSignUpLoaded) return;

    if (email === "" || password === "" || confirmPassword === "") {
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
      // Start sign-up process using email and password provided
      await signUp.create({
        emailAddress: email,
        password,
      });

      // Send user an email with verification code
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      setCurrentScreen(Screens.OTP);
      setPreviousScreen(Screens.SIGNUP_1);
    } catch (err: any) {
      console.log("Error: ", JSON.stringify(err, null, 2));
      return displayToast({
        type: ToastType.ERROR,
        description: err.errors[0].message,
      });
    } finally {
      onSettled();
    }
  }

  async function onHandleResetPassword() {
    try {
      // await resetPassword({ email, password });
    } catch (error: any) {
      return displayToast({
        type: ToastType.ERROR,
        description: error.message,
      });
    } finally {
      setCurrentScreen(Screens.LOGIN_1);
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
              <Text style={styles.heading}>Sign in to Leankly</Text>
              <Text style={styles.subheading}>Enter your details</Text>
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">
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
                    className="flex-1 ml-3 text-gray-900"
                    editable={!isLoading}
                  />
                </View>
              </View>
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">
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
                    className="flex-1 ml-3 text-gray-900"
                    editable={!isLoading}
                  />
                </View>
              </View>
              <TouchableOpacity
                onPress={function () {
                  setCurrentScreen(Screens.FORGOT_PASSWORD);
                }}
              >
                <Text
                  style={{
                    color: tint,
                    fontSize: 15,
                  }}
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
              >
                Don't have an account?
              </Text>
              <TouchableOpacity
                onPress={function () {
                  setCurrentScreen(Screens.SIGNUP_1);
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
                <Text style={styles.heading}>Sign up for Leankly</Text>
                <Text style={styles.subheading}>Enter your email</Text>
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
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
                      className="flex-1 ml-3 text-gray-900"
                      editable={!isLoading}
                    />
                  </View>
                </View>
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
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
                      className="flex-1 ml-3 text-gray-900"
                      editable={!isLoading}
                    />
                  </View>
                </View>
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
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
                      className="flex-1 ml-3 text-gray-900"
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
                      email === "" || password === "" || confirmPassword === ""
                    }
                  />
                </View>
                <Text
                  style={{
                    lineHeight: 20,
                    color: "darkgrey",
                    fontSize: 13,
                  }}
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
              >
                Already have an account?
              </Text>
              <TouchableOpacity
                onPress={function () {
                  setCurrentScreen(Screens.LOGIN_1);
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

      {/*------------------VERIFY EMAIL OTP PAGE-------------------------*/}
      {currentScreen === Screens.OTP && (
        <Animated.View
          layout={LinearTransition}
          entering={FadeIn.duration(500)}
          className="flex-1"
        >
          <SafeAreaView>
            <OTPVerification
              email={email}
              onBackBtn={function () {
                setCurrentScreen(previousScreen);
              }}
              onVerifyBtn={function (otp: string) {
                onButtonClick(otp);
              }}
              isCurrentScreen={currentScreen === Screens.OTP}
            />
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
                  setCurrentScreen(Screens.LOGIN_1);
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
                <Text style={styles.heading}>Forgot Password?</Text>
                <Text style={{ color: "darkgrey", marginTop: 10 }}>
                  Don't worry! It happens. Please enter the email associated
                  with this account
                </Text>
              </View>
              <View style={{ marginVertical: 30 }}>
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
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
                      className="flex-1 ml-3 text-gray-900"
                      editable={!isLoading}
                    />
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.container2}>
              <View style={templateStyles.buttonSize}>
                <CustomButton
                  label="Verify"
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
      {/*--------------------------RESET PASSWORD-------------------------------*/}
      {currentScreen === Screens.RESET_PASSWORD && (
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
                  setCurrentScreen(Screens.SIGNUP_1);
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
              <Text style={styles.heading}>Reset Password</Text>
              <Text style={styles.subheading}>
                Your new password should be different from your previous
                password.
              </Text>
              <View style={{ marginBottom: 10 }}>
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
                    className="flex-1 ml-3 text-gray-900"
                    editable={!isLoading}
                  />
                </View>
              </View>
              <View style={{ marginBottom: 10 }}>
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
                    className="flex-1 ml-3 text-gray-900"
                    editable={!isLoading}
                  />
                </View>
              </View>
            </View>
            <View style={[templateStyles.buttonSize, { marginVertical: 30 }]}>
              <CustomButton
                label="Continue"
                onPress={onButtonClick}
                isLoading={isLoading}
                isDisabled={
                  (password === "" || confirmPassword === "") &&
                  password !== confirmPassword
                }
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
              >
                Have an account already?{" "}
              </Text>
              <TouchableOpacity
                onPress={function () {
                  setCurrentScreen(Screens.LOGIN_1);
                }}
              >
                <Text
                  style={{
                    lineHeight: 20,
                    color: tint,
                    fontSize: 15,
                  }}
                >
                  Log in
                </Text>
              </TouchableOpacity>
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
