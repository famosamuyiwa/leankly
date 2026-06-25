import { Asset } from "expo-asset";
import * as Font from "expo-font";
import { preloadAuthPlaybackVideo } from "@/lib/auth-playback-video";

const startupFonts = {
  "Plus-Jakarta-Regular": require("@/assets/fonts/PlusJakartaSans-Regular.ttf"),
  "Plus-Jakarta-Medium": require("@/assets/fonts/PlusJakartaSans-Medium.ttf"),
  "Plus-Jakarta-Light": require("@/assets/fonts/PlusJakartaSans-Light.ttf"),
  "Plus-Jakarta-ExtraLight": require("@/assets/fonts/PlusJakartaSans-ExtraLight.ttf"),
  "Plus-Jakarta-Bold": require("@/assets/fonts/PlusJakartaSans-Bold.ttf"),
  "Plus-Jakarta-SemiBold": require("@/assets/fonts/PlusJakartaSans-SemiBold.ttf"),
  "Plus-Jakarta-ExtraBold": require("@/assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
};

const startupAssetModules: number[] = [
  require("@/assets/images/android-icon-background.png"),
  require("@/assets/images/android-icon-foreground.png"),
  require("@/assets/images/android-icon-monochrome.png"),
  require("@/assets/images/auth_playback_poster.jpg"),
  require("@/assets/images/avatar-placeholder.jpg"),
  require("@/assets/images/avatar.png"),
  require("@/assets/images/cover.png"),
  require("@/assets/images/favicon.png"),
  require("@/assets/images/gradient-icon.png"),
  require("@/assets/images/icon.png"),
  require("@/assets/images/leankly_plus_header.png"),
  require("@/assets/images/liquid-glass-icon.png"),
  require("@/assets/images/onboarding.png"),
  require("@/assets/images/splash-icon.png"),
  require("@/assets/images/white-icon.png"),
  require("@/assets/icons/apple.png"),
  require("@/assets/icons/google.png"),
  require("@/assets/videos/auth_playback.mov"),
];

const startupAnimationModules = [require("@/assets/animations/searching.json")];

export async function loadStartupAssets() {
  await Promise.all([
    Font.loadAsync(startupFonts),
    Asset.loadAsync(startupAssetModules),
    preloadAuthPlaybackVideo(),
  ]);

  startupAnimationModules.forEach((animationModule) => {
    if (!animationModule) {
      throw new Error("Bundled startup animation failed to load.");
    }
  });
}
