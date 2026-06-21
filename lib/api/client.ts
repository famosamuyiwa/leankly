import { account, appwriteConfig } from "@/appwrite/config";
import { Leank, Message, Participants, User } from "@/interfaces";
import { fetch as expoFetch } from "expo/fetch";
import { createJwtProvider, requestWithJwt } from "./auth-token";
import {
  ApiResult,
  ChatDetailResponse,
  ChatListResponse,
  ChatMessagePage,
  RequestListResponse,
  UnreadCountResponse,
} from "./types";

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

function compatibilityAdapter(value: unknown): any {
  if (Array.isArray(value)) return value.map(compatibilityAdapter);
  if (!value || typeof value !== "object") return value;
  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(input)) {
    output[key] =
      key === "date" && typeof item === "string"
        ? new Date(item)
        : compatibilityAdapter(item);
  }
  if (typeof input.id === "string") output.$id = input.id;
  if (input.createdAt) output.$createdAt = input.createdAt;
  if (input.updatedAt) output.$updatedAt = input.updatedAt;
  if ("avatarUrl" in input && !("avatar" in input)) {
    output.avatar = input.avatarUrl || "";
  }
  if (input.type === "USER" || input.type === "SYSTEM") {
    output.type = input.type.toLowerCase();
  }
  if ("replyToId" in input) output.replyToMessageId = input.replyToId;
  if ("replyToSender" in input) output.replyToSenderName = input.replyToSender;
  if ("senderId" in input && input.senderId === null) output.senderId = "";
  return output;
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
  return compatibilityAdapter(body.data) as T;
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
    apiFetch<{ items: Leank[]; nextCursor: string | null; hasMore: boolean }>(
      `/v1/leanks/feed?${params(query)}`,
    ),
  getHosted: () => apiFetch<{ items: Leank[] }>("/v1/leanks/hosted"),
  getAttended: () => apiFetch<{ items: Leank[] }>("/v1/leanks/attended"),
  async getChats(): Promise<ChatListResponse> {
    const [result, unread] = await Promise.all([
      apiFetch<{ items: Leank[] }>("/v1/leanks/chats"),
      this.getUnreadCount(),
    ]);
    return { chats: result.items, metas: [], unreadCount: unread.unreadCount };
  },
  async getChat(chatId: string): Promise<ChatDetailResponse> {
    return { chat: await apiFetch<Leank>(`/v1/leanks/${chatId}`) };
  },
  getMessages(chatId: string, cursor?: string, limit = 50) {
    return apiFetch<ChatMessagePage>(
      `/v1/leanks/${chatId}/messages?${params({ cursor, limit })}`,
    );
  },
  getParticipants(chatId: string) {
    return apiFetch<{ participants: Participants[] }>(
      `/v1/leanks/${chatId}/participants`,
    );
  },
  async sendMessage(
    chatId: string,
    body: { content: string; replyToMessageId?: string | null },
  ) {
    const result = await apiFetch<{ message: Message }>(
      `/v1/leanks/${chatId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          content: body.content,
          replyToId: body.replyToMessageId,
        }),
      },
    );
    const { chat } = await this.getChat(chatId);
    return { message: result.message, chat };
  },
  async markChatRead(chatId: string): Promise<UnreadCountResponse> {
    await apiFetch(`/v1/leanks/${chatId}/read`, { method: "PATCH" });
    return this.getUnreadCount();
  },
  async getUnreadCount(): Promise<UnreadCountResponse> {
    const { count } = await apiFetch<{ count: number }>(
      "/v1/users/me/unread-count",
    );
    return { unreadCount: count };
  },
  getRequests: () => apiFetch<RequestListResponse>("/v1/reactions/requests"),
  async acceptRequest(requestId: string) {
    await apiFetch(`/v1/reactions/${requestId}/accept`, { method: "POST" });
    return this.getRequests();
  },
  async declineRequest(requestId: string) {
    await apiFetch(`/v1/reactions/${requestId}/decline`, { method: "POST" });
    return this.getRequests();
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
  getUsage: () => apiFetch<any>("/v1/users/me/usage"),
  getEntitlements: () =>
    apiFetch<{ isPro: boolean; expiresAt: string | null }>(
      "/v1/entitlements/me",
    ),
};
