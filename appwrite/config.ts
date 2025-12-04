import { PushNotificationRequest } from "@/interfaces";
import { Client, Functions, Storage, TablesDB } from "react-native-appwrite";

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

if (!process.env.EXPO_PUBLIC_APPWRITE_SEND_PUSH_FUNCTION_ID) {
  throw new Error("EXPO_PUBLIC_APPWRITE_SEND_PUSH_FUNCTION_ID is not set");
}

if (!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  throw new Error("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set");
}

const appwriteConfig = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  platform: "com.barrakudadev.leankly",
  db: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
  sendPushFunctionId: process.env.EXPO_PUBLIC_APPWRITE_SEND_PUSH_FUNCTION_ID,
  storage: process.env.EXPO_PUBLIC_APPWRITE_STORAGE_BUCKET_ID,
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

async function sendPushNotification(body: PushNotificationRequest) {
  try {
    const { type, data } = body;
    const payload = JSON.stringify({ type, data });

    const result = await functions.createExecution({
      functionId: appwriteConfig.sendPushFunctionId, // your function ID
      body: payload,
    });
  } catch (err) {
    console.error("Error executing function:", err);
  }
}

export { appwriteConfig, client, db, sendPushNotification, storage };
