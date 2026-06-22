import { User } from "@/interfaces";

export type AuthIdentity = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
};

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type AuthSessionState = {
  status: AuthStatus;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  identity: AuthIdentity | null;
  profile: User | null;
  error: string | null;
};

export type AuthCredentials = {
  email: string;
  password: string;
  name?: string;
};

export type EmailOtpChallenge = {
  userId: string;
};

export type OAuthProviderName = "google" | "apple";
