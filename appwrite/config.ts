import { PushNotificationRequest } from "@/interfaces";
import {
  Account,
  Client,
  Functions,
  Storage,
  TablesDB,
} from "react-native-appwrite";

if (!process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID) {
  throw new Error("EXPO_PUBLIC_APPWRITE_PROJECT_ID is not set");
}

if (!process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT) {
  throw new Error("EXPO_PUBLIC_APPWRITE_ENDPOINT is not set");
}

if (!process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID) {
  throw new Error("EXPO_PUBLIC_APPWRITE_DATABASE_ID is not set");
}

if (!process.env.EXPO_PUBLIC_APPWRITE_STORAGE_BUCKET_ID) {
  throw new Error("EXPO_PUBLIC_APPWRITE_STORAGE_BUCKET_ID is not set");
}

const classifyFunctionId =
  process.env.EXPO_PUBLIC_APPWRITE_CLASSIFY_FUNCTION_ID ||
  process.env.EXPO_PUBLIC_APPWRITE_CLASSIFY_LEANK_FUNCTION_ID ||
  null;

const appwriteConfig = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  platform: "com.barrakudadev.leankly",
  oauthCallbackScheme: `appwrite-callback-${process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID}`,
  authWebUrl: (
    process.env.EXPO_PUBLIC_AUTH_WEB_URL || "https://leankly.com"
  ).replace(/\/+$/, ""),
  db: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
  apiBaseUrl: process.env.EXPO_PUBLIC_APPWRITE_API_BASE_URL || "",
  sendPushFunctionId:
    process.env.EXPO_PUBLIC_APPWRITE_SEND_PUSH_FUNCTION_ID || "",
  storage: process.env.EXPO_PUBLIC_APPWRITE_STORAGE_BUCKET_ID,
  classifyLeankFunctionId: classifyFunctionId,
  tables: {
    leanks: "leanks",
    messages: "messages",
    userChatMeta: "userchatmeta",
    user: "user",
    participants: "participants",
    reactions: "reactions",
    referrals: "referrals",
    blocks: "blocks",
    reports: "reports",
  },
};

const client = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setPlatform(appwriteConfig.platform);

const db = new TablesDB(client);
const functions = new Functions(client);
const storage = new Storage(client);
const account = new Account(client);

async function sendPushNotification(body: PushNotificationRequest) {
  try {
    if (!appwriteConfig.sendPushFunctionId) {
      throw new Error("EXPO_PUBLIC_APPWRITE_SEND_PUSH_FUNCTION_ID is not set");
    }

    const { type, data } = body;
    const payload = JSON.stringify({ type, data });

    await functions.createExecution({
      functionId: appwriteConfig.sendPushFunctionId, // your function ID
      body: payload,
    });
  } catch (err) {
    console.error("Error executing function:", err);
  }
}

export {
  account,
  appwriteConfig,
  client,
  db,
  functions,
  sendPushNotification,
  storage,
};
