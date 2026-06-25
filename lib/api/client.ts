import { account, appwriteConfig } from "@/appwrite/config";
import {
  Leank,
  Message,
  User,
  UserChatMeta,
} from "@/interfaces";
import { fetch as expoFetch } from "expo/fetch";
import { createJwtProvider, requestWithJwt } from "./auth-token";
import {
  ApiResult,
  AttentionCountsResponse,
  ChatDetailResponse,
  ChatListResponse,
  ChatMessagePage,
  EntitlementsResponse,
  PaginatedLeanksResponse,
  PaginatedParticipantsResponse,
  ProfileLeankCountsResponse,
  RequestListResponse,
  UnreadCountResponse,
  UsageResponse,
} from "./types";
import { unwrapApiData } from "./response";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code = "API_ERROR",
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const jwtProvider = createJwtProvider(() =>
  account.createJWT().then(({ jwt }) => jwt),
);

export function clearApiJwt() {
  jwtProvider.clear();
}

export async function getAppwriteJwt(force = false) {
  return jwtProvider.get(force);
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!appwriteConfig.apiBaseUrl) {
    throw new ApiError(
      "EXPO_PUBLIC_API_BASE_URL is not set",
      0,
      "NO_API_BASE_URL",
    );
  }
  const response = await requestWithJwt(jwtProvider, (token) =>
    expoFetch(`${appwriteConfig.apiBaseUrl}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    }),
  );
  const body = (await response.json().catch(() => null)) as ApiResult<T> | null;
  if (!response.ok || !body?.ok) {
    const error = body && !body.ok ? body.error : null;
    throw new ApiError(
      error?.message || `Request failed with status ${response.status}`,
      error?.status || response.status,
      error?.code,
    );
  }
  return unwrapApiData(body);
}

function params(input: Record<string, unknown>) {
  const search = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value))
      value.forEach((item) => search.append(key, String(item)));
    else search.set(key, String(value));
  });
  return search.toString();
}

export const apiClient = {
  getMe: () => apiFetch<User>("/v1/users/me"),
  updateMe: (body: Record<string, unknown>) =>
    apiFetch<User>("/v1/users/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteMe: () =>
    apiFetch<{ deletedAt: string }>("/v1/users/me", { method: "DELETE" }),
  updatePushTarget: (body: {
    targetId: string;
    providerId: string;
    platform: "ios" | "android";
    enabled?: boolean;
  }) =>
    apiFetch("/v1/users/me/push-token", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  confirmMedia: (body: {
    fileId: string;
    bucket: "avatars" | "leank_covers";
    purpose: "avatar" | "leank_cover";
  }) =>
    apiFetch<{ fileId: string; viewUrl: string }>("/v1/media/confirm", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  createLeank: (body: Record<string, unknown>) =>
    apiFetch<Leank>("/v1/leanks", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getFeed: (query: Record<string, unknown>) =>
    apiFetch<PaginatedLeanksResponse>(`/v1/leanks/feed?${params(query)}`),
  getHosted: (query: Record<string, unknown> = {}) =>
    apiFetch<PaginatedLeanksResponse>(`/v1/leanks/hosted?${params(query)}`),
  getAttended: (query: Record<string, unknown> = {}) =>
    apiFetch<PaginatedLeanksResponse>(`/v1/leanks/attended?${params(query)}`),
  getProfileLeankCounts: () =>
    apiFetch<ProfileLeankCountsResponse>("/v1/leanks/profile-counts"),
  async getChats(query: Record<string, unknown> = {}): Promise<ChatListResponse> {
    const result = await apiFetch<{
      items: Leank[];
      metas: UserChatMeta[];
      unreadCount: number;
      nextCursor: string | null;
      hasMore: boolean;
    }>(`/v1/leanks/chats?${params(query)}`);
    return {
      chats: result.items,
      metas: result.metas,
      unreadCount: result.unreadCount,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    };
  },
  async getChat(chatId: string): Promise<ChatDetailResponse> {
    return { chat: await apiFetch<Leank>(`/v1/leanks/${chatId}`) };
  },
  getMessages(chatId: string, cursor?: string, limit = 50) {
    return apiFetch<ChatMessagePage>(
      `/v1/leanks/${chatId}/messages?${params({ cursor, limit })}`,
    );
  },
  getParticipants(chatId: string, query: Record<string, unknown> = {}) {
    return apiFetch<PaginatedParticipantsResponse>(
      `/v1/leanks/${chatId}/participants?${params(query)}`,
    );
  },
  async sendMessage(
    chatId: string,
    body: { content: string; replyToId?: string | null },
  ) {
    const result = await apiFetch<{ message: Message }>(
      `/v1/leanks/${chatId}/messages`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
    const { chat } = await this.getChat(chatId);
    return { message: result.message, chat };
  },
  async markChatRead(chatId: string): Promise<AttentionCountsResponse> {
    await apiFetch(`/v1/leanks/${chatId}/read`, { method: "PATCH" });
    return this.getAttentionCounts();
  },
  async getUnreadCount(): Promise<UnreadCountResponse> {
    const { count } = await apiFetch<{ count: number }>(
      "/v1/users/me/unread-count",
    );
    return { unreadCount: count };
  },
  getAttentionCounts: () =>
    apiFetch<AttentionCountsResponse>("/v1/users/me/attention-counts"),
  getRequests: (query: Record<string, unknown> = {}) =>
    apiFetch<RequestListResponse>(`/v1/reactions/requests?${params(query)}`),
  async acceptRequest(requestId: string) {
    return apiFetch(`/v1/reactions/${requestId}/accept`, { method: "POST" });
  },
  async declineRequest(requestId: string) {
    return apiFetch(`/v1/reactions/${requestId}/decline`, { method: "POST" });
  },
  leaveChat: (chatId: string) =>
    apiFetch(`/v1/leanks/${chatId}/leave`, { method: "POST" }),
  closeChat: (chatId: string) =>
    apiFetch(`/v1/leanks/${chatId}/close`, { method: "POST" }),
  removeParticipant: (chatId: string, userId: string) =>
    apiFetch(`/v1/leanks/${chatId}/participants/${userId}`, {
      method: "DELETE",
    }),
  react: (leankId: string, action: "like" | "skip") =>
    apiFetch<{ reaction: unknown }>("/v1/reactions", {
      method: "POST",
      body: JSON.stringify({ leankId, action }),
    }),
  undoReaction: (leankId: string) =>
    apiFetch<{ leankId: string; undone: boolean }>(`/v1/reactions/${leankId}`, {
      method: "DELETE",
    }),
  getBlocks: () => apiFetch<{ blockedUserIds: string[] }>("/v1/blocks"),
  blockUser: (blockedId: string) =>
    apiFetch("/v1/blocks", {
      method: "POST",
      body: JSON.stringify({ blockedId }),
    }),
  reportUser: (reportedId: string, reason: string, notes?: string) =>
    apiFetch("/v1/reports", {
      method: "POST",
      body: JSON.stringify({ reportedId, reason, notes }),
    }),
  getReferral: () =>
    apiFetch<{
      referralCode: string;
      referralCount: number;
      bonusInterests: number;
    }>("/v1/users/me/referral"),
  applyReferral: (code: string) =>
    apiFetch<{ applied: boolean; reason?: string }>(
      "/v1/users/me/referral/apply",
      {
        method: "POST",
        body: JSON.stringify({ code }),
      },
    ),
  getUsage: () => apiFetch<UsageResponse>("/v1/users/me/usage"),
  getEntitlements: () =>
    apiFetch<EntitlementsResponse>("/v1/entitlements/me"),
  setDeveloperMode: (enabled: boolean) =>
    apiFetch<EntitlementsResponse>("/v1/entitlements/me/developer-mode", {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    }),
};
