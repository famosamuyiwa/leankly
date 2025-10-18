import { PushNotificationRequest } from "@/interfaces";
import { Client, Functions, TablesDB } from "react-native-appwrite";

if (!process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID) {
  throw new Error("EXPO_PUBLIC_APPWRITE_PROJECT_ID is not set");
}

if (!process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT) {
  throw new Error("EXPO_PUBLIC_APPWRITE_ENDPOINT is not set");
}

if (!process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID) {
  throw new Error("EXPO_PUBLIC_APPWRITE_DATABASE_ID is not set");
}

const appwriteConfig = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  platform: "com.barrakudadev.leankly",
  db: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
  sendPushFunctionId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
  tables: {
    leanks: "leanks",
    messages: "messages",
    userChatMeta: "userchatmeta",
    user: "user",
  },
};

const client = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setPlatform(appwriteConfig.platform);

const db = new TablesDB(client);
const functions = new Functions(client);

async function sendPushNotification(body: PushNotificationRequest) {
  try {
    const { type, data } = body;
    const payload = JSON.stringify({ type, data });

    const result = await functions.createExecution({
      functionId: appwriteConfig.sendPushFunctionId, // your function ID
      body: payload,
    });

    console.log("Push function executed:", result);
  } catch (err) {
    console.error("Error executing function:", err);
  }
}

export { appwriteConfig, client, db, sendPushNotification };
