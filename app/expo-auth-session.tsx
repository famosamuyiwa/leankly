import { appwriteConfig, db } from "@/config/appwrite";
import { Colors } from "@/constants/common";
import { usePushNotification } from "@/lib/PushNotificationContext";
import { useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator } from "react-native";
import { Query } from "react-native-appwrite";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

export default function ExpoAuthSessionRedirect() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const { expoPushToken } = usePushNotification();

  useEffect(() => {
    if (!isLoaded) return; // Clerk still loading
    if (!isSignedIn || !user) return; // No valid session yet
    const saveUserToDB = async () => {
      // Small delay to ensure Clerk updates the user data
      try {
        // Get user data from Clerk
        const currentUser = user;
        if (!currentUser) return;

        const { id, fullName, emailAddresses, imageUrl } = currentUser;
        const email = emailAddresses?.[0]?.emailAddress;

        /* -----------------------------
             🧩 Check for existing record
          ----------------------------- */

        console.log("checking for existing...");
        const { rows, total } = await db.listRows({
          databaseId: appwriteConfig.db,
          tableId: appwriteConfig.tables.user,
          queries: [Query.equal("$id", id)],
        });

        if (total === 0) {
          // ✅ Create new user in Appwrite
          await db.createRow({
            databaseId: appwriteConfig.db,
            tableId: appwriteConfig.tables.user,
            rowId: id,
            data: {
              name: fullName || "",
              email: email || "",
              avatar: imageUrl || "",
              age: "",
              location: "",
              sex: "",
              pushToken: expoPushToken || "",
            },
          });
          console.log(`✅ New user saved to Appwrite: ${email}`);
        } else {
          console.log(`⚠️ User already exists in Appwrite: ${email}`);
        }
      } catch (e) {
        console.warn("Error Saving user data to appwrite: ", e);
      }
    };

    saveUserToDB();
  }, [isLoaded, isSignedIn, user]);

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(500)}
      className="flex-1 items-center justify-center"
    >
      <ActivityIndicator size="large" color={Colors.primary} />
    </Animated.View>
  );
}
