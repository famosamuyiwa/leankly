import { Models } from "react-native-appwrite";
import { LeankStatus, PushNotificationTypes } from "./constants/enums";

export interface ToastProps {
  type?: "success" | "warning" | "error";
  description?: string;
  duration?: number;
}

export interface User extends Models.Row {
  avatar: string;
  name: string;
  email: string;
  age: number;
  location: string;
  pushToken?: string;
  sex?: string;
  referralCode?: string;
  bonusInterests: number;
  referralCount?: number;
}

export interface Leank extends Models.Row {
  cover: string;
  title: string;
  description: string;
  status?: LeankStatus;
  peopleRequired: number;
  date: Date;
  time: string;
  location: string;
  owner?: User;
  ownerId: string;
  participantIds?: string[];
  lastMessage?: Message;
}

export interface Reactions extends Models.Row {
  userId: string;
  leankId: string;
  isLiked: boolean;
  isDeclined: boolean;
}

export interface LeankRequest extends Models.Row {
  userId: string;
  leankId: string;
  user: User;
  leank: Leank;
}

export interface Message extends Models.Row {
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

export interface UserChatMeta extends Models.Row {
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

export interface Participants extends Models.Row {
  leank: Leank;
  user: User;
}
