export interface ToastProps {
  type?: "success" | "warning" | "error";
  description?: string;
  duration?: number;
}

export interface User {
  avatar: string;
  name: string;
  email: string;
}
