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

export interface BackendDocument {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;
  [key: string]: unknown;
}

export interface User extends BackendDocument {
  avatar: string;
  name: string;
  email: string;
  age: number;
  location: string;
  locationLat?: number | null;
  locationLng?: number | null;
  pushToken?: string;
  sex?: string;
  referralCode?: string;
  bonusInterests: number;
  referralCount?: number;
}

export interface Leank extends BackendDocument {
  cover: string;
  title: string;
  description?: string;
  status?: LeankStatus;
  category?: LeankCategory;
  peopleRequired?: number;
  date: Date;
  time: string;
  location: string;
  locationLat?: number | null;
  locationLng?: number | null;
  owner?: User;
  ownerId: string;
  participantIds?: string[];
  lastMessage?: Message;
}

export interface Reactions extends BackendDocument {
  userId: string;
  leankId: string;
  isLiked: boolean;
  isDeclined: boolean;
  status?: RequestAction;
}

export interface LeankRequest extends BackendDocument {
  userId: string;
  leankId: string;
  user: User;
  leank: Leank;
}

export interface Message extends BackendDocument {
  content: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  leankId: string;
  type?: "system" | "user";
  replyToMessageId?: string | null;
  replyToSenderId?: string | null;
  replyToSenderName?: string | null;
  replyToContent?: string | null;
}

export interface BasicUser {
  $id: string;
  name?: string;
  age?: number;
  avatar?: string;
  joinedAt?: string;
}

export interface Block {
  $id: string;
  blockerId: string;
  blockedId: string;
  createdAt?: string;
}

export interface Report {
  $id: string;
  reporterId: string;
  reportedId: string;
  reason: string;
  notes?: string;
  $createdAt?: string;
}

export interface UserChatMeta extends BackendDocument {
  leankId: string;
  userId: string;
  readAt: Date;
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
  size?: any;
}

export interface Participants extends BackendDocument {
  leank: Leank;
  user: User;
}
