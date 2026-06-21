import { appwriteConfig, db } from "@/appwrite/config";
import { User } from "@/interfaces";
import { generateRandomUsername } from "@/lib/utils";
import { Models } from "react-native-appwrite";

type SyncProfileInput = {
  accountUser: Models.User<Models.Preferences>;
  expoPushToken?: string | null;
  fallbackName?: string;
};

function makeInitialsAvatarUrl(name: string) {
  const url = new URL(`${appwriteConfig.endpoint}/avatars/initials`);
  url.searchParams.set("name", name);
  url.searchParams.set("width", "200");
  url.searchParams.set("height", "200");
  url.searchParams.set("project", appwriteConfig.projectId);
  return url.toString();
}

export async function upsertAppwriteProfile({
  accountUser,
  expoPushToken,
  fallbackName,
}: SyncProfileInput) {
  const rowId = accountUser.$id;
  const name =
    fallbackName?.trim() ||
    accountUser.name?.trim() ||
    generateRandomUsername();

  try {
    const existing = (await db.getRow({
      databaseId: appwriteConfig.db,
      tableId: appwriteConfig.tables.user,
      rowId,
    })) as unknown as User;

    if (expoPushToken && existing.pushToken !== expoPushToken) {
      return (await db.updateRow({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.user,
        rowId,
        data: { pushToken: expoPushToken },
      })) as unknown as User;
    }

    return existing;
  } catch {
    return (await db.createRow({
      databaseId: appwriteConfig.db,
      tableId: appwriteConfig.tables.user,
      rowId,
      data: {
        name,
        email: accountUser.email || "",
        avatar: makeInitialsAvatarUrl(name),
        age: null,
        location: "",
        locationLat: null,
        locationLng: null,
        sex: "",
        pushToken: expoPushToken || "",
      },
    })) as unknown as User;
  }
}
