import Constants, { ExecutionEnvironment } from "expo-constants";
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
} from "react-native-purchases";
import { Platform } from "react-native";

const APPLE_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY ?? "";
const ANDROID_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY ?? "";

export const ACTIVE_ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ?? "";

let configured = false;

/** RevenueCat runs in browser mode inside Expo Go; native-only APIs like logIn are unreliable there. */
export const isRevenueCatNativeAvailable = () =>
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

export const ensureRevenueCatConfigured = () => {
  if (configured) return true;
  const apiKey = Platform.OS === "ios" ? APPLE_API_KEY : ANDROID_API_KEY;
  if (!apiKey) {
    console.warn(
      "[RevenueCat] Missing API key for platform. Premium purchase flow disabled."
    );
    return false;
  }

  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey });
  configured = true;
  return true;
};

export const hasActiveEntitlement = (info?: CustomerInfo | null) => {
  if (!info) return false;
  if (ACTIVE_ENTITLEMENT_ID) {
    return Boolean(info.entitlements.active[ACTIVE_ENTITLEMENT_ID]);
  }

  return Object.keys(info.entitlements.active ?? {}).length > 0;
};
