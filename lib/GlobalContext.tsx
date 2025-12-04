import {
  blockUser as blockUserAPI,
  fetchBlocked,
  reportUser as reportUserAPI,
} from "@/appwrite/actions/user.actions";
import { appwriteConfig, db } from "@/appwrite/config";
import { Toast } from "@/components/animation-toast/components";
import Loader from "@/components/Loader";
import UserPreviewModal from "@/components/UserPreviewModal";
import { LeankStatus } from "@/constants/enums";
import { BasicUser, Leank, ToastProps, User, UserChatMeta } from "@/interfaces";
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
  currentUser: User | undefined;
  unreadCount: number;
  refetchCurrentUser: () => void;
  setUnreadCount: (val: number) => void;
  setCurrentUser: (user: User | undefined) => void;
  displayToast: (toast: ToastProps) => void;
  showLoader: (label?: string, pulse?: boolean) => void;
  hideLoader: () => void;
  alertComingSoon: () => void;
  blockedUserIds: string[];
  blockUser: (userId: string) => void;
  isBlocked: (userId?: string | null) => boolean;
  openUserPreview: (user: BasicUser) => void;
  closeUserPreview: () => void;
  reportUser: (userId: string, reason: string, notes?: string) => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider = ({ children }: { children: ReactNode }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | undefined>(undefined);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [previewUser, setPreviewUser] = useState<BasicUser | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const toastRef = useRef<any>({});
  const loaderRef = useRef<any>({});

  const displayToast = (toast: ToastProps) => {
    toastRef.current.show({
      type: toast.type,
      description: toast.description,
    });
  };

  //fetch first unread once after app launch
  useEffect(() => {
    if (!currentUser) return;
    loadBlocked();

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
              "status",
            ]),
            Query.or([
              Query.equal("ownerId", currentUser.$id),
              Query.contains("participantIds", currentUser.$id),
            ]),
            Query.equal("status", LeankStatus.ACTIVE),
          ],
        });
        const chatRooms = rows as unknown as Leank[];

        const { rows: metaRows } = await db.listRows({
          databaseId: appwriteConfig.db,
          tableId: appwriteConfig.tables.userChatMeta,
          queries: [Query.equal("userId", currentUser.$id)],
        });
        const chatMetas = metaRows as unknown as UserChatMeta[];

        const unread = chatRooms.filter((room) => {
          const meta = chatMetas.find(
            (m) => m.leankId === room.$id && m.userId === currentUser.$id
          );
          return (
            room.lastMessage &&
            new Date(room.lastMessage.$createdAt) >
              new Date(meta?.readAt || 0) &&
            room.lastMessage.senderId !== currentUser.$id
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
  }, [currentUser]);

  const loadBlocked = async () => {
    if (!currentUser?.$id) return;
    try {
      const rows = await fetchBlocked(currentUser.$id);
      setBlockedUserIds(rows.map((r) => r.blockedId));
    } catch (e) {
      console.log("Failed to load blocked users", e);
    }
  };

  const blockUser = async (userId: string) => {
    if (!userId || userId === currentUser?.$id) return;
    try {
      await blockUserAPI(currentUser!.$id, userId);
      const rows = await fetchBlocked(currentUser!.$id);
      setBlockedUserIds(rows.map((r) => r.blockedId));
      displayToast({
        type: "success",
        description: "User blocked",
      });
      setShowPreview(false);
    } catch (e) {
      displayToast({
        type: "error",
        description: "Could not block user",
      });
      console.log(e);
    }
  };

  const isBlocked = (userId?: string | null) => {
    if (!userId) return false;
    return blockedUserIds.includes(userId);
  };

  const openUserPreview = (user: BasicUser) => {
    if (!user?.$id || user.$id === currentUser?.$id) return;
    setPreviewUser(user);
    setShowPreview(true);
  };

  const reportUser = async (userId: string, reason: string, notes?: string) => {
    if (!currentUser?.$id || !userId || !reason) return;
    try {
      await reportUserAPI(currentUser.$id, userId, reason, notes);
      displayToast({
        type: "success",
        description: "Report submitted",
      });
    } catch (e) {
      displayToast({
        type: "error",
        description: "Could not submit report",
      });
      console.log(e);
    } finally {
      setShowPreview(false);
    }
  };

  const closeUserPreview = () => {
    setShowPreview(false);
    setPreviewUser(null);
  };

  const refetchCurrentUser = async () => {
    if (!currentUser) return;
    const user = await db.getRow({
      databaseId: appwriteConfig.db,
      tableId: appwriteConfig.tables.user,
      rowId: currentUser?.$id,
    });

    if (user) {
      setCurrentUser(user as unknown as User);
    }
  };

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
        currentUser,
        refetchCurrentUser,
        setCurrentUser,
        setUnreadCount,
        displayToast,
        showLoader,
        hideLoader,
        alertComingSoon,
        blockedUserIds,
        blockUser,
        isBlocked,
        openUserPreview,
        closeUserPreview,
        reportUser,
      }}
    >
      {children}
      <Loader ref={loaderRef} />
      <Toast ref={toastRef} />
      <UserPreviewModal
        visible={showPreview}
        user={previewUser}
        onClose={closeUserPreview}
        onBlock={(id) => blockUser(id)}
        isBlocked={(id) => isBlocked(id)}
        disableBlock={previewUser?.$id === currentUser?.$id}
        onReport={(id, reason, notes) => reportUser(id, reason, notes)}
      />
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
