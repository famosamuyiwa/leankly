import { Toast } from "@/components/animation-toast/components";
import Loader from "@/components/Loader";
import { appwriteConfig, db } from "@/config/appwrite";
import { Leank, ToastProps, UserChatMeta } from "@/interfaces";
import { useUser } from "@clerk/clerk-expo";
import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Query } from "react-native-appwrite";

interface GlobalContextType {
  unreadCount: number;
  setUnreadCount: (val: number) => void;
  displayToast: (toast: ToastProps) => void;
  showLoader: (label?: string, pulse?: boolean) => void;
  hideLoader: () => void;
  alertComingSoon: () => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider = ({ children }: { children: ReactNode }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const toastRef = useRef<any>({});
  const loaderRef = useRef<any>({});
  const { user } = useUser();

  const displayToast = (toast: ToastProps) => {
    toastRef.current.show({
      type: toast.type,
      description: toast.description,
    });
  };

  //fetch first unread once after app launch
  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      try {
        const { rows } = await db.listRows({
          databaseId: appwriteConfig.db,
          tableId: appwriteConfig.tables.leanks,
          queries: [
            Query.limit(10),
            Query.select([
              "lastMessage.senderId",
              "lastMessage.$createdAt",
              "ownerId",
              "participantIds",
            ]),
            Query.or([
              Query.equal("ownerId", user.id),
              Query.contains("participantIds", user.id),
            ]),
          ],
        });
        const chatRooms = rows as unknown as Leank[];

        const { rows: metaRows } = await db.listRows({
          databaseId: appwriteConfig.db,
          tableId: appwriteConfig.tables.userChatMeta,
          queries: [Query.equal("userId", user.id)],
        });
        const chatMetas = metaRows as unknown as UserChatMeta[];

        const unread = chatRooms.filter((room) => {
          const meta = chatMetas.find(
            (m) => m.leankId === room.$id && m.userId === user?.id
          );
          return (
            room.lastMessage &&
            new Date(room.lastMessage.$createdAt) >
              new Date(meta?.readAt || 0) &&
            room.lastMessage.senderId !== user?.id
          );
        }).length;

        setUnreadCount(unread);
      } catch (e) {
        console.error(e);
      }
    };

    fetchUnread();

    // optional cleanup (if you want to cancel or reset state later)
    return () => {
      setUnreadCount(0);
    };
  }, []);

  const showLoader = (label?: string, pulse?: boolean) => {
    loaderRef.current.show(label, pulse);
  };

  const hideLoader = () => {
    loaderRef.current.hide();
  };

  const alertComingSoon = () => {
    alert("This feature is not yet available. Coming Soon 🚀");
  };

  return (
    <GlobalContext.Provider
      value={{
        unreadCount,
        setUnreadCount,
        displayToast,
        showLoader,
        hideLoader,
        alertComingSoon,
      }}
    >
      {children}
      <Loader ref={loaderRef} />
      <Toast ref={toastRef} />
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = (): GlobalContextType => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error("useGlobalContext must be used within a GlobalProvider");
  }
  return context;
};

export default GlobalProvider;
