import { User } from "@/interfaces";
import { apiClient } from "@/lib/api/client";
import { Models } from "react-native-appwrite";

type SyncProfileInput = {
  accountUser: Models.User<Models.Preferences>;
  fallbackName?: string;
};

export async function syncBackendProfile({
  accountUser,
  fallbackName,
}: SyncProfileInput): Promise<User> {
  const profile = await apiClient.getMe();
  const desiredName = fallbackName?.trim() || accountUser.name?.trim();
  if (desiredName && desiredName !== profile.name) {
    return apiClient.updateMe({ name: desiredName });
  }
  return profile;
}
