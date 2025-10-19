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
  age: string;
  location: string;
  pushToken?: string;
  sex?: string;
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

export interface LeankRequest extends Models.Row {
  user: User;
  leank: Leank;
}

export interface Message extends Models.Row {
  content: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  leankId: string;
}

export interface UserChatMeta extends Models.Row {
  leankId: string;
  userId: string;
  readAt: Date;
}

export interface PushNotificationRequest {
  type: PushNotificationTypes;
  data: Message;
}

export interface MediaResult {
  uri: string;
  name?: string;
  type?: string;
  size?: any;
}
