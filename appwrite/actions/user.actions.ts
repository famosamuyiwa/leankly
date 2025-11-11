import { generateRandomUsername } from "@/lib/utils";
import { router } from "expo-router";
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
          name: fullName || generateRandomUsername(),
          email: email || "",
          avatar: imageUrl || "",
          age: "",
          location: "",
          sex: "",
          pushToken: expoPushToken || "",
        },
      });
      console.log(`✅ New user saved to Appwrite: ${email}`);
    }
    router.replace("/");
  } catch (e) {
    console.warn("Error Saving user data to appwrite: ", e);
  }
};

// --- Referrals ---

function generateReferralCode(name: string) {
  const prefix =
    (name.length > 5 ? name.trim().slice(0, 4) : name).toUpperCase() || "USER";
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${suffix}`;
}

export const getOrCreateReferral = async (userId: string) => {
  try {
    const userRow = await db.getRow({
      databaseId: appwriteConfig.db,
      tableId: appwriteConfig.tables.user,
      rowId: userId,
    });

    let { referralCode, referralCount, bonusInterests, name } = userRow as any;
    if (!referralCode) {
      referralCode = generateReferralCode(name);
      await db.updateRow({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.user,
        rowId: userId,
        data: {
          referralCode,
          referralCount: referralCount || 0,
          bonusInterests: bonusInterests || 0,
        },
      });
    }

    return {
      referralCode,
      referralCount: referralCount || 0,
      bonusInterests: bonusInterests || 0,
    } as {
      referralCode: string;
      referralCount: number;
      bonusInterests: number;
    };
  } catch (e) {
    console.warn("getOrCreateReferral failed", e);
    throw e;
  }
};

export const getReferralStats = async (userId: string) => {
  try {
    const userRow = await db.getRow({
      databaseId: appwriteConfig.db,
      tableId: appwriteConfig.tables.user,
      rowId: userId,
    });
    const { referralCode, referralCount, bonusInterests } = userRow as any;
    return {
      referralCode: referralCode || null,
      referralCount: referralCount || 0,
      bonusInterests: bonusInterests || 0,
    } as {
      referralCode: string | null;
      referralCount: number;
      bonusInterests: number;
    };
  } catch (e) {
    console.warn("getReferralStats failed", e);
    return { referralCode: null, referralCount: 0, bonusInterests: 0 };
  }
};

export const applyReferralCode = async (
  newUserId: string,
  code: string,
  interestsPerReferral = 10
) => {
  try {
    // Find referrer by code
    const { rows, total } = await db.listRows({
      databaseId: appwriteConfig.db,
      tableId: appwriteConfig.tables.user,
      queries: [Query.equal("referralCode", code)],
    });

    if (!total || total === 0)
      return { ok: false, reason: "INVALID_CODE" } as const;

    const referrer = rows[0] as any;
    if (!referrer?.$id || referrer.$id === newUserId) {
      return { ok: false, reason: "SELF_REFERRAL" } as const;
    }

    // Idempotency: check if referral already recorded
    try {
      const existing = await db.listRows({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.referrals,
        queries: [
          Query.equal("referrerId", referrer.$id),
          Query.equal("referredId", newUserId),
        ],
      });
      if (existing.total && existing.total > 0) {
        return { ok: true, reason: "ALREADY_APPLIED" } as const;
      }
    } catch (e) {
      // If referrals table not set up yet, skip idempotency check
      console.log("referrals table check failed (may not exist)", e);
    }

    // Record referral
    try {
      await db.createRow({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.referrals,
        rowId: require("react-native-appwrite").ID.unique(),
        data: {
          referrerId: referrer.$id,
          referredId: newUserId,
          code,
        },
      });
    } catch (e) {
      console.log("referrals table insert failed (may not exist)", e);
    }

    // Update referrer stats: increment count and bonusInterests pool
    await db.updateRow({
      databaseId: appwriteConfig.db,
      tableId: appwriteConfig.tables.user,
      rowId: referrer.$id,
      data: {
        referralCount: (referrer.referralCount || 0) + 1,
        bonusInterests:
          (referrer.bonusInterests || 0) + (interestsPerReferral || 0),
      },
    });

    // Mark referredBy on new user for tracking
    try {
      await db.updateRow({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.user,
        rowId: newUserId,
        data: { referredBy: referrer.$id },
      });
    } catch (e) {}

    return { ok: true } as const;
  } catch (e) {
    console.warn("applyReferralCode failed", e);
    return { ok: false, reason: "ERROR" } as const;
  }
};

export const consumeBonusInterest = async (
  userId: string
): Promise<{ ok: boolean; remaining: number }> => {
  try {
    const userRow = await db.getRow({
      databaseId: appwriteConfig.db,
      tableId: appwriteConfig.tables.user,
      rowId: userId,
    });
    const current = (userRow as any)?.bonusInterests || 0;
    if (current <= 0) return { ok: false, remaining: 0 };
    const next = current - 1;
    await db.updateRow({
      databaseId: appwriteConfig.db,
      tableId: appwriteConfig.tables.user,
      rowId: userId,
      data: { bonusInterests: next },
    });
    return { ok: true, remaining: next };
  } catch (e) {
    console.warn("consumeBonusInterest failed", e);
    return { ok: false, remaining: 0 };
  }
};
