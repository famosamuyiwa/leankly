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
        data: { userId, leankId, isLiked, user: userId, leank: leankId },
      });
    }
  } catch (err) {
    console.error("Failed to record reaction:", err);
  }
};

/**
 * Safely updates a string[] field in an Appwrite row.
 * Supports both add and remove operations without overwriting existing data.
 */
export async function updateArrayRow({
  tableId,
  rowId,
  field,
  values,
  action = "add",
}: {
  tableId: string;
  rowId: string;
  field: string;
  values: string[];
  action?: "add" | "remove";
}) {
  try {
    // 1️⃣ Fetch the existing row
    const row = await db.getRow({
      databaseId: appwriteConfig.db,
      tableId,
      rowId,
    });

    // 2️⃣ Get current array or initialize empty
    const currentArray = Array.isArray(row[field])
      ? (row[field] as string[])
      : [];

    // 3️⃣ Determine the next state
    let updatedArray: string[];

    if (action === "add") {
      // ✅ Add without duplicates
      updatedArray = Array.from(new Set([...currentArray, ...values]));
    } else {
      // ✅ Remove items that match
      updatedArray = currentArray.filter((item) => !values.includes(item));
    }

    // 4️⃣ Persist the updated array
    const updated = await db.updateRow({
      databaseId: appwriteConfig.db,
      tableId,
      rowId,
      data: { [field]: updatedArray },
    });

    return updated;
  } catch (err) {
    console.error("❌ Failed to update array field:", err);
    throw err;
  }
}
