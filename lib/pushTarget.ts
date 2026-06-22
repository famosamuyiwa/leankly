import { account, appwriteConfig } from "@/appwrite/config";
import { apiClient } from "@/lib/api/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { ID } from "react-native-appwrite";

const key = (identityId: string) => `push-target.${identityId}`;

export async function syncPushTarget(identityId: string, token: string) {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  const providerId =
    Platform.OS === "ios"
      ? appwriteConfig.apnsProviderId
      : appwriteConfig.fcmProviderId;
  if (!providerId) return;
  let targetId = await SecureStore.getItemAsync(key(identityId));
  if (targetId) {
    try {
      await account.updatePushTarget({ targetId, identifier: token });
    } catch {
      await SecureStore.deleteItemAsync(key(identityId));
      targetId = null;
    }
  }
  if (!targetId) {
    targetId = ID.unique();
    await account.createPushTarget({
      targetId,
      identifier: token,
      providerId,
    });
    await SecureStore.setItemAsync(key(identityId), targetId);
  }
  await apiClient.updatePushTarget({
    targetId,
    providerId,
    platform: Platform.OS,
    enabled: true,
  });
}

export async function deletePushTarget(identityId: string) {
  const targetId = await SecureStore.getItemAsync(key(identityId));
  if (!targetId) return;
  await account.deletePushTarget({ targetId }).catch(() => undefined);
  await SecureStore.deleteItemAsync(key(identityId));
}
