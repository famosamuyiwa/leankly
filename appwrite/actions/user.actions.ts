import { Query } from "react-native-appwrite";
import { appwriteConfig, db } from "../config";

export const saveUserToDB = async (currentUser: any, expoPushToken: any) => {
  try {
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
