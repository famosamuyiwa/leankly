import { account } from "@/appwrite/config";
import { ToastType } from "@/constants/enums";
import { useGlobalContext } from "@/lib/GlobalContext";
import { usePushNotification } from "@/lib/PushNotificationContext";
import * as WebBrowser from "expo-web-browser";
import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ID, Models, OAuthProvider } from "react-native-appwrite";
import { authRedirects, makeOAuthReturnUrl } from "./redirects";
import {
  AuthCredentials,
  AuthSessionState,
  EmailOtpChallenge,
  OAuthProviderName,
} from "./types";
import { upsertAppwriteProfile } from "./profileSync";

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
    accountUser: null,
    profile: null,
    error: null,
  });
  const bootstrapRef = useRef(false);

  const applyAccountUser = useCallback(
    async (
      accountUser: Models.User<Models.Preferences>,
      fallbackName?: string,
    ) => {
      const profile = await upsertAppwriteProfile({
        accountUser,
        expoPushToken,
        fallbackName,
      });
      setCurrentUser(profile);
      setState({
        status: "authenticated",
        isLoading: false,
        isAuthenticated: true,
        isEmailVerified: accountUser.emailVerification,
        accountUser,
        profile,
        error: null,
      });
    },
    [expoPushToken, setCurrentUser],
  );

  const refreshSession = useCallback(async () => {
    try {
      const accountUser = await account.get();
      await applyAccountUser(accountUser);
    } catch (error: any) {
      setCurrentUser(undefined);
      setState({
        status: "unauthenticated",
        isLoading: false,
        isAuthenticated: false,
        isEmailVerified: false,
        accountUser: null,
        profile: null,
        error: error?.message || null,
      });
    }
  }, [applyAccountUser, setCurrentUser]);

  useEffect(() => {
    if (bootstrapRef.current) return;
    bootstrapRef.current = true;
    // Auth bootstrap is centralized here so route guards do not retry DB reads in loops.
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (!state.accountUser || !expoPushToken) return;
    void applyAccountUser(state.accountUser);
  }, [applyAccountUser, expoPushToken, state.accountUser]);

  const loginWithEmail = useCallback(
    async ({ email, password }: AuthCredentials) => {
      await account.createEmailPasswordSession({ email, password });
      const accountUser = await account.get();

      if (!accountUser.emailVerification) {
        // A token session cannot be created while this password session is active.
        await account.deleteSession({ sessionId: "current" });
        const token = await account.createEmailToken({
          userId: accountUser.$id,
          email: accountUser.email,
        });
        return { userId: token.userId };
      }

      await applyAccountUser(accountUser);
      return null;
    },
    [applyAccountUser],
  );

  const signUpWithEmail = useCallback(
    async ({ email, password, name }: AuthCredentials) => {
      const accountUser = await account.create({
        userId: ID.unique(),
        email,
        password,
        name,
      });

      const token = await account.createEmailToken({
        userId: accountUser.$id,
        email: accountUser.email,
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
      const accountUser = await account.get();
      await applyAccountUser(accountUser);
    },
    [applyAccountUser],
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
        const accountUser = await account.get();
        await applyAccountUser(accountUser);
        return;
      }

      displayToast({
        type: ToastType.ERROR,
        description: "Sign in was cancelled",
      });
    },
    [applyAccountUser, displayToast],
  );

  const logout = useCallback(async () => {
    try {
      await account.deleteSession({ sessionId: "current" });
    } catch {
      // Appwrite throws when there is no current session; logout should still clear local state.
    } finally {
      setCurrentUser(undefined);
      setState({
        status: "unauthenticated",
        isLoading: false,
        isAuthenticated: false,
        isEmailVerified: false,
        accountUser: null,
        profile: null,
        error: null,
      });
    }
  }, [setCurrentUser]);

  const deactivateAccount = useCallback(async () => {
    await account.updateStatus();
    setCurrentUser(undefined);
    setState({
      status: "unauthenticated",
      isLoading: false,
      isAuthenticated: false,
      isEmailVerified: false,
      accountUser: null,
      profile: null,
      error: null,
    });
  }, [setCurrentUser]);

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
