import { Account, Client, Storage } from "react-native-appwrite";
import * as Device from "expo-device";
import { Platform } from "react-native";

const endpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
if (!endpoint || !projectId) {
  throw new Error("Appwrite endpoint and project ID must be configured");
}

const physicalDeviceBackendUrl =
  "https://impish-pelican-blade.ngrok-free.dev";
const usePhysicalDeviceBackend =
  __DEV__ && Device.isDevice && Platform.OS !== "web";

function backendUrl(value: string) {
  return (usePhysicalDeviceBackend ? physicalDeviceBackendUrl : value).replace(
    /\/+$/,
    "",
  );
}

export const appwriteConfig = {
  endpoint,
  projectId,
  platform: "com.barrakudadev.leankly",
  oauthCallbackScheme: `appwrite-callback-${projectId}`,
  authWebUrl: (
    process.env.EXPO_PUBLIC_AUTH_WEB_URL || "https://leankly.com"
  ).replace(/\/+$/, ""),
  apiBaseUrl: backendUrl(process.env.EXPO_PUBLIC_API_BASE_URL || ""),
  socketUrl: backendUrl(
    process.env.EXPO_PUBLIC_SOCKET_URL ||
      process.env.EXPO_PUBLIC_API_BASE_URL ||
      "",
  ),
  avatarBucket: process.env.EXPO_PUBLIC_APPWRITE_AVATAR_BUCKET_ID || "",
  leankCoverBucket:
    process.env.EXPO_PUBLIC_APPWRITE_LEANK_COVER_BUCKET_ID || "",
  apnsProviderId: process.env.EXPO_PUBLIC_APPWRITE_APNS_PROVIDER_ID || "",
  fcmProviderId: process.env.EXPO_PUBLIC_APPWRITE_FCM_PROVIDER_ID || "",
};

export const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setPlatform(appwriteConfig.platform);

export const storage = new Storage(client);
export const account = new Account(client);
