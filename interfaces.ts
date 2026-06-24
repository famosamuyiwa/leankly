import {
  LeankCategory,
  LeankStatus,
  PushNotificationTypes,
  RequestAction,
} from "./constants/enums";

export interface ToastProps {
  type?: "success" | "warning" | "error";
  description?: string;
  duration?: number;
}

export interface BackendEntity {
  id: string;
  createdAt: string;
  updatedAt?: string;
}

export type UserRole = "USER" | "ADMIN" | "QA" | "DEV";
export type UserPermission = "leankly_plus_bypass";

export interface User extends BackendEntity {
  avatar: string;
  avatarFileId?: string | null;
  role: UserRole;
  permissions: UserPermission[];
  name: string;
  email: string;
  emailVerified: boolean;
  age: number | null;
  location: string;
  locationLat: number | null;
  locationLng: number | null;
  sex: string;
  referralCode: string | null;
  bonusInterests: number;
  referralCount: number;
  onboardingComplete: boolean;
}

export interface BasicUser {
  id: string;
  name?: string;
  age?: number | null;
  avatar?: string;
  joinedAt?: string;
}

export interface Leank extends BackendEntity {
  cover: string;
  coverFileId?: string | null;
  title: string;
  description: string;
  status: LeankStatus;
  category: LeankCategory;
  peopleRequired: number;
  date: string;
  time: string;
  location: string;
  locationLat: number | null;
  locationLng: number | null;
  isOnline: boolean;
  owner?: BasicUser;
  ownerId: string;
  participantIds: string[];
  lastMessage?: Message;
  lastMessageAt?: string | null;
}

export interface Reactions extends BackendEntity {
  userId: string;
  leankId: string;
  isLiked: boolean;
  status: RequestAction;
}

export interface LeankRequest {
  id: string;
  userId: string;
  leankId: string;
  user: BasicUser;
  leank: Pick<Leank, "id" | "title" | "ownerId">;
  createdAt: string;
}

export interface Message extends BackendEntity {
  content: string;
  senderId: string | null;
  senderName: string;
  senderPhoto: string | null;
  leankId: string;
  type: "SYSTEM" | "USER";
  replyToId?: string | null;
  replyToSender?: string | null;
  replyToContent?: string | null;
}

export interface Block {
  id: string;
  blockerId?: string;
  blockedId: string;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId?: string;
  reportedId?: string;
  reason?: string;
  notes?: string | null;
  createdAt: string;
}

export interface UserChatMeta extends BackendEntity {
  leankId: string;
  userId: string;
  readAt: string | null;
}

export interface PNAlert {
  title: string;
  content: string;
}

export interface PushNotificationRequest {
  type: PushNotificationTypes;
  data: Message | PNAlert;
}

export interface MediaResult {
  uri: string;
  name?: string;
  type?: string;
  size?: number;
}

export interface Participants {
  id: string;
  joinedAt?: string;
  leank?: Leank;
  user: BasicUser;
}
