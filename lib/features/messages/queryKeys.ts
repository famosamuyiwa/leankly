export const chatDetailQueryKey = (chatId?: string) =>
  ["messages", "chat", "detail", chatId] as const;
