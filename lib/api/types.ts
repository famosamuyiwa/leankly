import {
  Leank,
  LeankRequest,
  Message,
  Participants,
  UserChatMeta,
} from "@/interfaces";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; status: number } };

export type PaginatedLeanksResponse = {
  items: Leank[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type ProfileLeankCountsResponse = {
  hosted: number;
  attended: number;
};

export type ChatSummary = Leank;

export type ChatMessage = Message;

export type ChatMessagePage = {
  messages: ChatMessage[];
  nextCursor: string | null;
};

export type RequestSummary = LeankRequest;

export type UnreadCountResponse = {
  unreadCount: number;
};

export type AttentionCountsResponse = {
  unreadChatCount: number;
  pendingRequestCount: number;
  totalCount: number;
};

export type QuotaState = {
  interestsUsed: number;
  interestsLimit: number;
  bonusInterests: number;
  isPro: boolean;
};

export type UsageResponse = {
  interestsUsedToday: number;
  undosUsedToday: number;
  bonusInterests: number;
  isPro: boolean;
  limits: {
    interests: number;
    undos: number;
  };
};

export type ChatListResponse = {
  chats: ChatSummary[];
  metas: UserChatMeta[];
  unreadCount: number;
};

export type ChatDetailResponse = {
  chat: ChatSummary;
};

export type RequestListResponse = {
  requests: RequestSummary[];
  totalPending?: number;
  visibleCount?: number;
  isLocked?: boolean;
};

export type ParticipantListResponse = {
  participants: Participants[];
};
