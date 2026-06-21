import { User } from "@/interfaces";
import { Models } from "react-native-appwrite";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type AuthSessionState = {
  status: AuthStatus;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  accountUser: Models.User<Models.Preferences> | null;
  profile: User | null;
  error: string | null;
};

export type AuthCredentials = {
  email: string;
  password: string;
  name?: string;
};

export type OAuthProviderName = "google" | "apple";
