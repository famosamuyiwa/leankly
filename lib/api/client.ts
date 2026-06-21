import { account, appwriteConfig } from "@/appwrite/config";
import {
  ApiResult,
  ChatDetailResponse,
  ChatListResponse,
  ChatMessage,
  ChatMessagePage,
  ParticipantListResponse,
  RequestListResponse,
  UnreadCountResponse,
} from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code = "API_ERROR"
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getJwt() {
  const jwt = await account.createJWT();
  return jwt.jwt;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!appwriteConfig.apiBaseUrl) {
    throw new ApiError("EXPO_PUBLIC_APPWRITE_API_BASE_URL is not set", 0, "NO_API_BASE_URL");
  }

  const token = await getJwt();
  const response = await fetch(`${appwriteConfig.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const body = (await response.json().catch(() => null)) as ApiResult<T> | null;
  if (!response.ok || !body?.ok) {
    const error = body && !body.ok ? body.error : null;
    throw new ApiError(
      error?.message || `Request failed with status ${response.status}`,
      error?.status || response.status,
      error?.code
    );
  }

  return body.data;
}

export const apiClient = {
  getChats() {
    return apiFetch<ChatListResponse>("/v1/chats");
  },
  getChat(chatId: string) {
    return apiFetch<ChatDetailResponse>(`/v1/chats/${chatId}`);
  },
  getMessages(chatId: string, cursor?: string, limit = 50) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return apiFetch<ChatMessagePage>(
      `/v1/chats/${chatId}/messages?${params.toString()}`
    );
  },
  getParticipants(chatId: string) {
    return apiFetch<ParticipantListResponse>(
      `/v1/chats/${chatId}/participants`
    );
  },
  sendMessage(
    chatId: string,
    body: {
      content: string;
      replyToMessageId?: string | null;
      replyToSenderId?: string | null;
      replyToSenderName?: string | null;
      replyToContent?: string | null;
    }
  ) {
    return apiFetch<{ message: ChatMessage; chat: ChatDetailResponse["chat"] }>(
      `/v1/chats/${chatId}/messages`,
      { method: "POST", body: JSON.stringify(body) }
    );
  },
  markChatRead(chatId: string) {
    return apiFetch<UnreadCountResponse>(`/v1/chats/${chatId}/read`, {
      method: "PATCH",
    });
  },
  getUnreadCount() {
    return apiFetch<UnreadCountResponse>("/v1/me/unread-count");
  },
  getRequests() {
    return apiFetch<RequestListResponse>("/v1/requests");
  },
  acceptRequest(requestId: string) {
    return apiFetch<RequestListResponse>(`/v1/requests/${requestId}/accept`, {
      method: "POST",
    });
  },
  declineRequest(requestId: string) {
    return apiFetch<RequestListResponse>(`/v1/requests/${requestId}/decline`, {
      method: "POST",
    });
  },
  leaveChat(chatId: string) {
    return apiFetch<{ chatId: string }>(`/v1/chats/${chatId}/leave`, {
      method: "POST",
    });
  },
  closeChat(chatId: string) {
    return apiFetch<{ chatId: string }>(`/v1/chats/${chatId}/close`, {
      method: "POST",
    });
  },
  removeParticipant(chatId: string, userId: string) {
    return apiFetch<{ chatId: string; userId: string }>(
      `/v1/chats/${chatId}/participants/${userId}`,
      { method: "DELETE" }
    );
  },
  addReaction(leankId: string) {
    return apiFetch<{ reaction: unknown }>(`/v1/leanks/${leankId}/reactions`, {
      method: "POST",
    });
  },
  deleteCurrentReaction(leankId: string) {
    return apiFetch<{ leankId: string }>(
      `/v1/leanks/${leankId}/reactions/current`,
      { method: "DELETE" }
    );
  },
};
