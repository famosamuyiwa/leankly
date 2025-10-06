import { LeankStatus } from "./constants/enums";

export interface ToastProps {
  type?: "success" | "warning" | "error";
  description?: string;
  duration?: number;
}

export interface User {
  avatar: string;
  name: string;
  email: string;
  age: string;
}

export interface Leank {
  $id: string;
  cover: string;
  title: string;
  description: string;
  status?: LeankStatus;
  peopleRequired: number;
  date: Date;
  time: string;
  location: string;
  owner?: User;
  participants?: Array<String>;
}

export interface LeankRequest {
  user: User;
  leank: Leank;
  dateCreated: Date;
  dateUpdated: Date;
}
