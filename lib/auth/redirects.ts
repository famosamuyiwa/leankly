import { appwriteConfig } from "@/appwrite/config";
import * as AuthSession from "expo-auth-session";

export const authRedirects = {
  passwordRecovery: `${appwriteConfig.authWebUrl}/reset-password`,
};

export function makeOAuthReturnUrl() {
  return AuthSession.makeRedirectUri({
    scheme: appwriteConfig.oauthCallbackScheme,
    preferLocalhost: true,
  });
}
