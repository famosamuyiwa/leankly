import { Colors } from "@/constants/common";
import { Message } from "@/interfaces";

export type DateSeparatorItem = {
  id: string;
  content: string;
  senderId: null;
  senderName: "System";
  senderPhoto: null;
  leankId: string;
  type: "DATE_SEPARATOR";
};

export type ChatListItem = Message | DateSeparatorItem;

export type ReplySwipeHandle = {
  close: () => void;
};

export const injectDateSeparators = (raw: Message[] = []): ChatListItem[] => {
  if (!Array.isArray(raw)) return [];
  const result: ChatListItem[] = [];
  let lastKey = "";

  raw.forEach((msg, idx) => {
    const createdAt =
      msg.createdAt || msg.updatedAt || new Date().toISOString();
    const dateObj = new Date(createdAt);
    const dateKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;

    if (dateKey !== lastKey) {
      // Date separators are local UI rows only; the backend stores real messages.
      result.push({
        id: `date-${dateKey}-${idx}`,
        content: formatDateLabel(dateObj),
        senderId: null,
        senderName: "System",
        senderPhoto: null,
        leankId: msg.leankId,
        type: "DATE_SEPARATOR",
      });
      lastKey = dateKey;
    }

    result.push(msg);
  });

  return result;
};

export const formatDateLabel = (date: Date) => {
  const now = new Date();
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.floor(
    (startOfDay(now) - startOfDay(date)) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export function isDateSeparator(
  message?: ChatListItem,
): message is DateSeparatorItem {
  return message?.type === "DATE_SEPARATOR";
}

export function isRealMessage(message: ChatListItem): message is Message {
  return !isDateSeparator(message);
}

export function isSystemMessage(message?: ChatListItem) {
  if (!message || isDateSeparator(message)) return true;
  return message.senderId === null || message.type === "SYSTEM";
}

export function isSameChatSender(
  previousOrNext: ChatListItem | undefined,
  item: ChatListItem,
) {
  if (!previousOrNext) return false;
  if (isSystemMessage(previousOrNext) || isSystemMessage(item)) return false;
  return previousOrNext.senderId === item.senderId;
}

const colorPalette = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
];

export const getUserColor = (id?: string | null) => {
  if (!id) return Colors.primary;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % colorPalette.length;
  return colorPalette[index];
};
