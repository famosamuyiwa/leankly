import { Client, TablesDB } from "react-native-appwrite";

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
  tables: {
    leanks: "leanks",
    messages: "messages",
  },
};

const client = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setPlatform(appwriteConfig.platform);

const db = new TablesDB(client);

export { appwriteConfig, client, db };
