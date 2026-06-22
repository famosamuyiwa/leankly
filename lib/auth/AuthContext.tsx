import { account } from "@/appwrite/config";
import { toAuthIdentity } from "@/appwrite/adapters";
import { ToastType } from "@/constants/enums";
import { apiClient, clearApiJwt } from "@/lib/api/client";
import { realtime } from "@/lib/api/realtime";
import { useGlobalContext } from "@/lib/GlobalContext";
import { usePushNotification } from "@/lib/PushNotificationContext";
import { deletePushTarget, syncPushTarget } from "@/lib/pushTarget";
import { queryClient } from "@/lib/queryClient";
import * as WebBrowser from "expo-web-browser";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ID, OAuthProvider } from "react-native-appwrite";
import { syncBackendProfile } from "./profileSync";
import { authRedirects, makeOAuthReturnUrl } from "./redirects";
import {
  AuthCredentials,
  AuthIdentity,
  AuthSessionState,
  EmailOtpChallenge,
  OAuthProviderName,
} from "./types";

type AuthContextValue = AuthSessionState & {
  refreshSession: () => Promise<void>;
  loginWithEmail: (
    credentials: AuthCredentials,
  ) => Promise<EmailOtpChallenge | null>;
  signUpWithEmail: (credentials: AuthCredentials) => Promise<EmailOtpChallenge>;
  resendEmailOtp: (email: string, userId: string) => Promise<EmailOtpChallenge>;
  verifyEmailOtp: (userId: string, otp: string) => Promise<void>;
  requestPasswordRecovery: (email: string) => Promise<void>;
  startOAuth: (provider: OAuthProviderName) => Promise<void>;
  logout: () => Promise<void>;
  deactivateAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const providerMap: Record<OAuthProviderName, OAuthProvider> = {
  google: OAuthProvider.Google,
  apple: OAuthProvider.Apple,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setCurrentUser, displayToast } = useGlobalContext();
  const { expoPushToken } = usePushNotification();
  const [state, setState] = useState<AuthSessionState>({
    status: "loading",
    isLoading: true,
    isAuthenticated: false,
    isEmailVerified: false,
    identity: null,
    profile: null,
    error: null,
  });
  const bootstrapRef = useRef(false);

  const applyIdentity = useCallback(
    async (identity: AuthIdentity, fallbackName?: string) => {
      const profile = await syncBackendProfile({
        identity,
        fallbackName,
      });
      if (expoPushToken) {
        await syncPushTarget(identity.id, expoPushToken).catch((error) =>
          console.warn("Push target registration failed", error),
        );
      }
      setCurrentUser(profile);
      setState({
        status: "authenticated",
        isLoading: false,
        isAuthenticated: true,
        isEmailVerified: identity.emailVerified,
        identity,
        profile,
        error: null,
      });
    },
    [expoPushToken, setCurrentUser],
  );

  const refreshSession = useCallback(async () => {
    try {
      const identity = toAuthIdentity(await account.get());
      await applyIdentity(identity);
    } catch (error: any) {
      setCurrentUser(undefined);
      setState({
        status: "unauthenticated",
        isLoading: false,
        isAuthenticated: false,
        isEmailVerified: false,
        identity: null,
        profile: null,
        error: error?.message || null,
      });
    }
  }, [applyIdentity, setCurrentUser]);

  useEffect(() => {
    if (bootstrapRef.current) return;
    bootstrapRef.current = true;
    // Auth bootstrap is centralized here so route guards do not retry DB reads in loops.
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (!state.identity || !expoPushToken) return;
    void applyIdentity(state.identity);
  }, [applyIdentity, expoPushToken, state.identity]);

  const loginWithEmail = useCallback(
    async ({ email, password }: AuthCredentials) => {
      await account.createEmailPasswordSession({ email, password });
      const identity = toAuthIdentity(await account.get());

      if (!identity.emailVerified) {
        // A token session cannot be created while this password session is active.
        await account.deleteSession({ sessionId: "current" });
        const token = await account.createEmailToken({
          userId: identity.id,
          email: identity.email,
        });
        return { userId: token.userId };
      }

      await applyIdentity(identity);
      return null;
    },
    [applyIdentity],
  );

  const signUpWithEmail = useCallback(
    async ({ email, password, name }: AuthCredentials) => {
      const identity = toAuthIdentity(
        await account.create({
          userId: ID.unique(),
          email,
          password,
          name,
        }),
      );

      const token = await account.createEmailToken({
        userId: identity.id,
        email: identity.email,
      });
      return { userId: token.userId };
    },
    [],
  );

  const resendEmailOtp = useCallback(async (email: string, userId: string) => {
    const token = await account.createEmailToken({ userId, email });
    return { userId: token.userId };
  }, []);

  const verifyEmailOtp = useCallback(
    async (userId: string, otp: string) => {
      if (!/^\d{6}$/.test(otp)) {
        throw new Error("Enter the six-digit code from your email.");
      }

      await account.createSession({ userId, secret: otp });
      const identity = toAuthIdentity(await account.get());
      await applyIdentity(identity);
    },
    [applyIdentity],
  );

  const requestPasswordRecovery = useCallback(async (email: string) => {
    await account.createRecovery({
      email,
      url: authRedirects.passwordRecovery,
    });
  }, []);

  const startOAuth = useCallback(
    async (provider: OAuthProviderName) => {
      const callbackUrl = makeOAuthReturnUrl();
      const url = account.createOAuth2Token({
        provider: providerMap[provider],
        success: callbackUrl,
        failure: callbackUrl,
      });
      if (!url) {
        throw new Error("Appwrite did not return an OAuth URL.");
      }

      const callbackScheme = `${new URL(callbackUrl).protocol}//`;
      const result = await WebBrowser.openAuthSessionAsync(
        url.toString(),
        callbackScheme,
      );

      if (result.type === "success") {
        const redirectUrl = new URL(result.url);
        const oauthError =
          redirectUrl.searchParams.get("error_description") ||
          redirectUrl.searchParams.get("error");
        if (oauthError) {
          throw new Error(oauthError);
        }

        const userId = redirectUrl.searchParams.get("userId");
        const secret = redirectUrl.searchParams.get("secret");
        if (!userId || !secret) {
          throw new Error("Appwrite did not return OAuth credentials.");
        }

        await account.createSession({ userId, secret });
        const identity = toAuthIdentity(await account.get());
        await applyIdentity(identity);
        return;
      }

      displayToast({
        type: ToastType.ERROR,
        description: "Sign in was cancelled",
      });
    },
    [applyIdentity, displayToast],
  );

  const logout = useCallback(async () => {
    try {
      if (state.identity) {
        await deletePushTarget(state.identity.id).catch((error) =>
          console.warn("Push target removal failed", error),
        );
      }

      // Push cleanup is best-effort and must never prevent the active Appwrite
      // session from being terminated before another sign-in is attempted.
      await account.deleteSession({ sessionId: "current" });
    } catch {
      // Appwrite throws when there is no current session; logout should still clear local state.
    } finally {
      clearApiJwt();
      realtime.disconnect();
      queryClient.clear();
      setCurrentUser(undefined);
      setState({
        status: "unauthenticated",
        isLoading: false,
        isAuthenticated: false,
        isEmailVerified: false,
        identity: null,
        profile: null,
        error: null,
      });
    }
  }, [setCurrentUser, state.identity]);

  const deactivateAccount = useCallback(async () => {
    await apiClient.deleteMe();
    if (state.identity) await deletePushTarget(state.identity.id);
    await account.updateStatus();
    clearApiJwt();
    realtime.disconnect();
    queryClient.clear();
    setCurrentUser(undefined);
    setState({
      status: "unauthenticated",
      isLoading: false,
      isAuthenticated: false,
      isEmailVerified: false,
      identity: null,
      profile: null,
      error: null,
    });
  }, [setCurrentUser, state.identity]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      refreshSession,
      loginWithEmail,
      signUpWithEmail,
      resendEmailOtp,
      verifyEmailOtp,
      requestPasswordRecovery,
      startOAuth,
      logout,
      deactivateAccount,
    }),
    [
      state,
      refreshSession,
      loginWithEmail,
      signUpWithEmail,
      resendEmailOtp,
      verifyEmailOtp,
      requestPasswordRecovery,
      startOAuth,
      logout,
      deactivateAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthSession() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthSession must be used within an AuthProvider");
  }
  return context;
}
