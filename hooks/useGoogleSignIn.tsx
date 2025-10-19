import { getRedirectUrl } from "@/lib/utils";
import { useSSO } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";
import { useCallback } from "react";

// Ensure pending sessions are handled
WebBrowser.maybeCompleteAuthSession();

export function useGoogleSSO() {
  const { startSSOFlow } = useSSO();
  const redirectUrl = getRedirectUrl();

  const signInWithGoogle = useCallback(async () => {
    try {
      const { createdSessionId, setActive, signIn, signUp } =
        await startSSOFlow({
          strategy: "oauth_google",
          redirectUrl,
        });
      if (createdSessionId) {
        // Set session active and handle navigation
        await setActive!({
          session: createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) {
              console.log(session?.currentTask);
              return;
            }
          },
        });
      } else {
        // Handle MFA or additional steps via signIn / signUp
        console.warn("Additional steps required:", { signIn, signUp });
      }
    } catch (err) {
      console.error("Google sign-in failed:", JSON.stringify(err, null, 2));
    }
  }, [startSSOFlow]);

  return { signInWithGoogle };
}
