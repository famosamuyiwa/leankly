import * as AuthSession from "expo-auth-session";

export const authRedirects = {
  oauthCallback: "leankly://auth/callback",
  emailVerify: "leankly://auth/verify",
  passwordRecovery: "leankly://auth/recovery",
};

export function makeNativeAuthRedirect(path: keyof typeof authRedirects) {
  return authRedirects[path];
}

export function makeOAuthReturnUrl() {
  return AuthSession.makeRedirectUri({
    scheme: "leankly",
    path: "auth/callback",
  });
}
