import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { registerForPushNotificationsAsync } from "./registerForPushNotificationsAsync";

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  error: Error | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const usePushNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

interface PushNotificationProviderProps {
  children: ReactNode;
}

const getNotificationLeankId = (data?: Record<string, unknown>) => {
  const directLeankId = data?.leankId;
  if (typeof directLeankId === "string") return directLeankId;

  const nestedData = data?.data;
  if (nestedData && typeof nestedData === "object") {
    const nestedLeankId = (nestedData as Record<string, unknown>).leankId;
    if (typeof nestedLeankId === "string") return nestedLeankId;
  }

  return undefined;
};

export const PushNotificationProvider: React.FC<
  PushNotificationProviderProps
> = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    registerForPushNotificationsAsync().then(
      (token) => setExpoPushToken(token),
      (error) => setError(error)
    );

    const notificationListener = Notifications.addNotificationReceivedListener(
      async (notification) => {
        // console.log("🔔 Notification Received: ", notification);
        setNotification(notification);

        // Wait a brief moment to ensure the notification is displayed
        // then dismiss it automatically
        setTimeout(async () => {
          try {
            // If you want to dismiss just this specific notification
            if (notification.request.identifier) {
              await Notifications.dismissNotificationAsync(
                notification.request.identifier
              );
            }
            // Or if you want to dismiss all notifications
            // await Notifications.dismissAllNotificationsAsync();
          } catch (error) {
            console.error("Error dismissing notification:", error);
          }
        }, 2000); // Adjust this delay as needed
      }
    );

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const leankId = getNotificationLeankId(
          response.notification.request.content.data as
            | Record<string, unknown>
            | undefined
        );
        if (!leankId) return;

        router.push({
          pathname: "/messages/[chat]",
          params: { chat: leankId },
        });
      });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{ expoPushToken, notification, error }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
