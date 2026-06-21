import { apiClient } from "@/lib/api/client";

export async function recordLeankAction(
  _userId: string,
  leankId: string,
  isLiked: boolean,
) {
  return apiClient.react(leankId, isLiked ? "like" : "skip");
}

export async function deleteLeankAction(_userId: string, leankId: string) {
  try {
    const result = await apiClient.undoReaction(leankId);
    return { ok: result.undone, deletedId: leankId };
  } catch (error) {
    return { ok: false, error };
  }
}
