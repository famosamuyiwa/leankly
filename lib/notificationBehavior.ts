import type { NotificationBehavior } from "expo-notifications";

export const SUPPRESS_FOREGROUND_NOTIFICATION = {
  shouldShowBanner: false,
  shouldShowList: false,
  shouldPlaySound: false,
  shouldSetBadge: false,
} satisfies NotificationBehavior;

export const getNotificationLeankId = (data?: Record<string, unknown>) => {
  const directLeankId = data?.leankId;
  if (typeof directLeankId === "string") return directLeankId;

  const nestedData = data?.data;
  if (nestedData && typeof nestedData === "object") {
    const nestedLeankId = (nestedData as Record<string, unknown>).leankId;
    if (typeof nestedLeankId === "string") return nestedLeankId;
  }

  return undefined;
};
