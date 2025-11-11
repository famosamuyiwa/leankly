import * as SecureStore from "expo-secure-store";

export const FreeLimits = {
  // Base daily interests for free users (formerly "interests")
  INTERESTS_PER_DAY: 1,
  // Bonus interests per successful referral
  INTERESTS_BONUS_PER_REFERRAL: 10,
  UNDOS_PER_DAY: 1,
  REQUESTS_VISIBLE: 1,
};

export function dailyInterestLimit(referralCount?: number) {
  const count = typeof referralCount === "number" ? referralCount : 0;
  return (
    FreeLimits.INTERESTS_PER_DAY +
    count * FreeLimits.INTERESTS_BONUS_PER_REFERRAL
  );
}

export type GateFeature = "interest" | "undo";

const todayKey = (userId: string | undefined, feature: GateFeature) => {
  const d = new Date();
  const day = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; // hyphens are allowed
  const raw = userId || "anon";
  const uid = raw.replace(/[^A-Za-z0-9._-]/g, "_");
  const f = feature.replace(/[^A-Za-z0-9._-]/g, "_");
  // SecureStore keys must only include A-Z a-z 0-9 . - _
  return `gate_${uid}_${f}_${day}`;
};

export async function getCount(
  userId: string | undefined,
  feature: GateFeature
) {
  const key = todayKey(userId, feature);
  const v = await SecureStore.getItemAsync(key);
  return v ? parseInt(v, 10) || 0 : 0;
}

export async function increment(
  userId: string | undefined,
  feature: GateFeature
) {
  const key = todayKey(userId, feature);
  const current = await getCount(userId, feature);
  await SecureStore.setItemAsync(key, String(current + 1));
}

export async function canUse(
  userId: string | undefined,
  feature: GateFeature,
  limit: number
) {
  const current = await getCount(userId, feature);
  return current < limit;
}
