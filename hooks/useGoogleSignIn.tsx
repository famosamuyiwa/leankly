import { useAuthSession } from "@/lib/auth/AuthContext";
import * as WebBrowser from "expo-web-browser";
import { useCallback } from "react";

// Ensure pending sessions are handled
WebBrowser.maybeCompleteAuthSession();

export function useGoogleSSO() {
  const { startOAuth } = useAuthSession();

  const signInWithGoogle = useCallback(async () => {
    await startOAuth("google");
  }, [startOAuth]);

  const signInWithApple = useCallback(async () => {
    await startOAuth("apple");
  }, [startOAuth]);

  return { signInWithApple, signInWithGoogle };
}
