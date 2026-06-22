import type { AuthIdentity } from "@/lib/auth/types";
import type { Models } from "react-native-appwrite";

export function toAuthIdentity(
  user: Models.User<Models.Preferences>,
): AuthIdentity {
  return {
    id: user.$id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerification,
  };
}

export function getAppwriteResourceId(resource: { $id: string }) {
  return resource.$id;
}
