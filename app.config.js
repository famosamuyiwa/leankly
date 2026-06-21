import "dotenv/config";

export default {
  expo: {
    name: "Leankly",
    slug: "leankly",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/liquid-glass-icon.png",
    scheme: "leankly",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.barrakudadev.leankly",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSAppTransportSecurity: {
          NSAllowsLocalNetworking: true,
        },
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
      },
      predictiveBackGestureEnabled: false,
      package: "com.barrakudadev.leankly",
      googleServicesFile: "./google-services.json",
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-font",
      "expo-image",
      "expo-status-bar",
      "expo-video",
      "expo-web-browser",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
        },
      ],
      "expo-secure-store",
      [
        "expo-location",
        {
          locationWhenInUsePermission: "Show current location on map.",
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "This app accesses your photos.",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      mapboxAccessToken: process.env.EXPO_MAPBOX_ACCESS_TOKEN,
      appwriteApiBaseUrl: process.env.EXPO_PUBLIC_APPWRITE_API_BASE_URL,
      eas: {
        projectId: "627c3530-bc48-4c22-8b50-1887a6af6422",
      },
    },
    owner: "barrakudadev",
  },
};
