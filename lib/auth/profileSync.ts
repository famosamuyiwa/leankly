import { User } from "@/interfaces";
import { apiClient } from "@/lib/api/client";
import { AuthIdentity } from "./types";

type SyncProfileInput = {
  identity: AuthIdentity;
  fallbackName?: string;
};

export async function syncBackendProfile({
  identity,
  fallbackName,
}: SyncProfileInput): Promise<User> {
  const profile = await apiClient.getMe();
  const desiredName = fallbackName?.trim() || identity.name.trim();
  if (desiredName && desiredName !== profile.name) {
    return apiClient.updateMe({ name: desiredName });
  }
  return profile;
}
