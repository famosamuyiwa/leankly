import { Account, Client, Storage } from "react-native-appwrite";

const endpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
if (!endpoint || !projectId) {
  throw new Error("Appwrite endpoint and project ID must be configured");
}

export const appwriteConfig = {
  endpoint,
  projectId,
  platform: "com.barrakudadev.leankly",
  oauthCallbackScheme: `appwrite-callback-${projectId}`,
  authWebUrl: (
    process.env.EXPO_PUBLIC_AUTH_WEB_URL || "https://leankly.com"
  ).replace(/\/+$/, ""),
  apiBaseUrl: (
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    process.env.EXPO_PUBLIC_APPWRITE_API_BASE_URL ||
    ""
  ).replace(/\/+$/, ""),
  socketUrl: (
    process.env.EXPO_PUBLIC_SOCKET_URL ||
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    ""
  ).replace(/\/+$/, ""),
  avatarBucket:
    process.env.EXPO_PUBLIC_APPWRITE_AVATAR_BUCKET_ID ||
    process.env.EXPO_PUBLIC_APPWRITE_STORAGE_BUCKET_ID ||
    "",
  leankCoverBucket:
    process.env.EXPO_PUBLIC_APPWRITE_LEANK_COVER_BUCKET_ID ||
    process.env.EXPO_PUBLIC_APPWRITE_STORAGE_BUCKET_ID ||
    "",
  apnsProviderId: process.env.EXPO_PUBLIC_APPWRITE_APNS_PROVIDER_ID || "",
  fcmProviderId: process.env.EXPO_PUBLIC_APPWRITE_FCM_PROVIDER_ID || "",
};

export const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setPlatform(appwriteConfig.platform);

export const storage = new Storage(client);
export const account = new Account(client);
