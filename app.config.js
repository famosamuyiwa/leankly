import "dotenv/config";

export default {
  expo: {
    name: "Leankly",
    slug: "leankly",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "leankly",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.barrakudadev.leankly",
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        googleServicesFile: "./google-services.json",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.barrakudadev.leankly",
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "red",
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
      googleMapsPlacesApiKey: process.env.EXPO_GOOGLE_MAPS_PLACES_API_KEY,
      eas: {
        projectId: "627c3530-bc48-4c22-8b50-1887a6af6422",
      },
    },
    owner: "barrakudadev",
  },
};
