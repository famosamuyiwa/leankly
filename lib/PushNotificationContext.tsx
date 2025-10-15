import { useUser } from "@clerk/clerk-expo";
import * as Notifications from "expo-notifications";
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

export const PushNotificationProvider: React.FC<
  PushNotificationProviderProps
> = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useUser();

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
        // console.log(
        //   "🔔 Notification Response: ",
        //   JSON.stringify(response, null, 2),
        //   JSON.stringify(response.notification.request.content.data, null, 2)
        // );
        // Handle the notification response here
      });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  useEffect(() => {
    if (!user || !expoPushToken) return;

    const tokenUpdate = async () => {
      try {
        // await updateUserPushToken(expoPushToken);
      } catch (err) {
        console.log("error: ", err);
      }
    };

    // if (!user.expoPushToken) {
    //   tokenUpdate();
    // }
  }, [expoPushToken]);

  return (
    <NotificationContext.Provider
      value={{ expoPushToken, notification, error }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
