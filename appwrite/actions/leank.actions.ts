import { leankCategories } from "@/constants/data";
import { LeankCategory, RequestAction } from "@/constants/enums";
import { ID, Query } from "react-native-appwrite";
import { appwriteConfig, db, functions } from "../config";

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
        data: {
          isLiked,
          ...(isLiked ? { status: RequestAction.PENDING } : {}),
        },
      });
    } else {
      // 3️⃣ Create new reaction
      await db.createRow({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.reactions,
        rowId: ID.unique(),
        data: {
          userId,
          leankId,
          isLiked,
          status: RequestAction.PENDING,
          user: userId,
          leank: leankId,
        },
      });
    }
  } catch (err) {
    console.error("Failed to record reaction:", err);
  }
};

export const deleteLeankAction = async (userId: string, leankId: string) => {
  try {
    const { rows } = await db.listRows({
      databaseId: appwriteConfig.db,
      tableId: appwriteConfig.tables.reactions,
      queries: [Query.equal("userId", userId), Query.equal("leankId", leankId)],
    });

    const reaction = rows[0];
    if (!reaction?.$id) {
      return { ok: true, deletedId: undefined };
    }

    await db.deleteRow({
      databaseId: appwriteConfig.db,
      tableId: appwriteConfig.tables.reactions,
      rowId: reaction.$id,
    });

    return { ok: true, deletedId: reaction.$id as string };
  } catch (err) {
    console.error("Failed to delete reaction:", err);
    return { ok: false, error: err };
  }
};

const FALLBACK_CATEGORY = LeankCategory.OTHER;

export const classifyLeankCategory = async (
  title: string,
  description: string
): Promise<LeankCategory> => {
  const functionId = appwriteConfig.classifyLeankFunctionId;
  if (!functionId) {
    console.warn(
      "EXPO_PUBLIC_APPWRITE_CLASSIFY_FUNCTION_ID is not set; defaulting category to Other."
    );
    return FALLBACK_CATEGORY;
  }

  try {
    const payload = JSON.stringify({
      title: title?.slice(0, 280) ?? "",
      description: description?.slice(0, 1200) ?? "",
      categories: leankCategories,
    });

    const execution = await functions.createExecution({
      functionId,
      body: payload,
    });

    const rawResponse =
      (execution as any)?.responseBody ??
      (execution as any)?.response ??
      (execution as any)?.stdout ??
      "";

    const parseCandidate = (value: any): string | undefined => {
      if (typeof value === "string") return value;
      if (Array.isArray(value)) {
        const first = value.find((item) => typeof item === "string");
        if (first) return first;
      }
      return undefined;
    };

    let parsed: any = rawResponse;
    try {
      if (typeof rawResponse === "string" && rawResponse.trim().length) {
        parsed = JSON.parse(rawResponse);
      }
    } catch {
      // The function might return plain text; ignore JSON parse errors.
    }

    const candidate =
      parseCandidate(parsed?.category) ||
      parseCandidate(parsed?.data?.category) ||
      parseCandidate(parsed?.result?.category) ||
      parseCandidate(parsed?.result) ||
      parseCandidate(parsed);

    if (candidate) {
      const normalize = (value: string) =>
        value.trim().toLowerCase().replace(/\s+/g, " ");
      const normalized = normalize(candidate);
      const match =
        leankCategories.find(
          (category) => normalize(category) === normalized
        ) ||
        leankCategories.find((category) =>
          normalize(category).includes(normalized)
        );
      if (match) return match;
    }
  } catch (err) {
    console.warn("Failed to classify leank category via Appwrite function", err);
  }

  return FALLBACK_CATEGORY;
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
