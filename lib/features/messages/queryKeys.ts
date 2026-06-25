export const chatDetailQueryKey = (chatId?: string) =>
  ["messages", "chat", "detail", chatId] as const;

export const chatParticipantsQueryKey = (chatId?: string) =>
  ["messages", "chat", "participants", chatId] as const;
