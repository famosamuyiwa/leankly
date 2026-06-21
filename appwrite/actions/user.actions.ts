import { apiClient, ApiError } from "@/lib/api/client";

export const blockUser = (_blockerId: string, blockedId: string) =>
  apiClient.blockUser(blockedId);

export async function fetchBlocked(_blockerId: string) {
  const response = await apiClient.getBlocks();
  return response.blockedUserIds.map((blockedId) => ({ blockedId }));
}

export const reportUser = (
  _reporterId: string,
  reportedId: string,
  reason: string,
  notes?: string,
) => apiClient.reportUser(reportedId, reason, notes);

export const getOrCreateReferral = (_userId: string) => apiClient.getReferral();
export const getReferralStats = (_userId: string) => apiClient.getReferral();

export async function applyReferralCode(
  _newUserId: string,
  code: string,
  _interestsPerReferral = 10,
) {
  try {
    const response = await apiClient.applyReferral(code);
    return {
      ok: response.applied || response.reason === "ALREADY_APPLIED",
      reason: response.reason,
    } as const;
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof ApiError ? error.code : "ERROR",
    } as const;
  }
}
