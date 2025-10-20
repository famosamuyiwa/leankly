import { ID, Query } from "react-native-appwrite";
import { appwriteConfig, db } from "../config";

export const recordLeankAction = async (
  userId: string,
  leankId: string,
  isLiked: boolean
) => {
  try {
    // 1️⃣ Check if a reaction already exists for this (user, leank)
    const { rows } = await db.listRows({
      databaseId: appwriteConfig.db,
      tableId: appwriteConfig.tables.reactions,
      queries: [Query.equal("userId", userId), Query.equal("leankId", leankId)],
    });

    if (rows.length > 0) {
      // 2️⃣ Update the existing reaction
      const reaction = rows[0];
      await db.updateRow({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.reactions,
        rowId: reaction.$id,
        data: { isLiked },
      });
    } else {
      // 3️⃣ Create new reaction
      await db.createRow({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.reactions,
        rowId: ID.unique(),
        data: { userId, leankId, isLiked },
      });
    }
  } catch (err) {
    console.error("Failed to record reaction:", err);
  }
};
