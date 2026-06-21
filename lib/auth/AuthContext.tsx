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
import { AuthCredentials, AuthSessionState, OAuthProviderName } from "./types";
import { upsertAppwriteProfile } from "./profileSync";

type AuthContextValue = AuthSessionState & {
  refreshSession: () => Promise<void>;
  loginWithEmail: (credentials: AuthCredentials) => Promise<void>;
  signUpWithEmail: (credentials: AuthCredentials) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  requestPasswordRecovery: (email: string) => Promise<void>;
  completePasswordRecovery: (
    userId: string,
    secret: string,
    password: string
  ) => Promise<void>;
  completeEmailVerification: (userId: string, secret: string) => Promise<void>;
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
    async (accountUser: Models.User<Models.Preferences>, fallbackName?: string) => {
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
    [expoPushToken, setCurrentUser]
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
      await applyAccountUser(accountUser);
      if (!accountUser.emailVerification) {
        await account
          .createVerification({ url: authRedirects.emailVerify })
          .catch(() => {});
        throw new Error("Check your email to verify your account.");
      }
    },
    [applyAccountUser]
  );

  const sendVerificationEmail = useCallback(async () => {
    await account.createVerification({ url: authRedirects.emailVerify });
  }, []);

  const signUpWithEmail = useCallback(
    async ({ email, password, name }: AuthCredentials) => {
      await account.create({
        userId: ID.unique(),
        email,
        password,
        name,
      });
      await account.createEmailPasswordSession({ email, password });
      await sendVerificationEmail();
      const accountUser = await account.get();
      await applyAccountUser(accountUser, name);
    },
    [applyAccountUser, sendVerificationEmail]
  );

  const requestPasswordRecovery = useCallback(async (email: string) => {
    await account.createRecovery({
      email,
      url: authRedirects.passwordRecovery,
    });
  }, []);

  const completePasswordRecovery = useCallback(
    async (userId: string, secret: string, password: string) => {
      await account.updateRecovery({ userId, secret, password });
    },
    []
  );

  const completeEmailVerification = useCallback(
    async (userId: string, secret: string) => {
      await account.updateVerification({ userId, secret });
      await refreshSession();
    },
    [refreshSession]
  );

  const startOAuth = useCallback(
    async (provider: OAuthProviderName) => {
      const callbackUrl = makeOAuthReturnUrl();
      const url = account.createOAuth2Session({
        provider: providerMap[provider],
        success: callbackUrl,
        failure: callbackUrl,
      });
      if (!url) {
        throw new Error("Appwrite did not return an OAuth URL.");
      }

      const result = await WebBrowser.openAuthSessionAsync(
        url.toString(),
        callbackUrl
      );

      if (result.type === "success") {
        await refreshSession();
        return;
      }

      displayToast({
        type: ToastType.ERROR,
        description: "Sign in was cancelled",
      });
    },
    [displayToast, refreshSession]
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
      sendVerificationEmail,
      requestPasswordRecovery,
      completePasswordRecovery,
      completeEmailVerification,
      startOAuth,
      logout,
      deactivateAccount,
    }),
    [
      state,
      refreshSession,
      loginWithEmail,
      signUpWithEmail,
      sendVerificationEmail,
      requestPasswordRecovery,
      completePasswordRecovery,
      completeEmailVerification,
      startOAuth,
      logout,
      deactivateAccount,
    ]
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
