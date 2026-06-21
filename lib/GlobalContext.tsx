import { Toast } from "@/components/animation-toast/components";
import Loader from "@/components/Loader";
import UserPreviewModal from "@/components/UserPreviewModal";
import { BasicUser, ToastProps, User } from "@/interfaces";
import { apiClient } from "@/lib/api/client";
import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

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
  const currentUserId = currentUser?.$id;

  const displayToast = (toast: ToastProps) => {
    toastRef.current.show({
      type: toast.type,
      description: toast.description,
    });
  };

  //fetch first unread once after app launch
  useEffect(() => {
    if (!currentUserId) return;
    let isMounted = true;

    const loadBlocked = async () => {
      try {
        const { blockedUserIds } = await apiClient.getBlocks();
        if (isMounted) {
          setBlockedUserIds(blockedUserIds);
        }
      } catch (e) {
        console.log("Failed to load blocked users", e);
      }
    };

    const fetchUnread = async () => {
      try {
        // The facade computes unread accurately server-side so launch avoids table fan-out.
        const { unreadCount } = await apiClient.getUnreadCount();

        if (isMounted) {
          setUnreadCount(unreadCount);
        }
      } catch (e) {
        console.error(e);
      }
    };

    void loadBlocked();
    void fetchUnread();

    // optional cleanup (if you want to cancel or reset state later)
    return () => {
      isMounted = false;
      setUnreadCount(0);
    };
  }, [currentUserId]);

  const blockUser = async (userId: string) => {
    if (!userId || userId === currentUser?.$id) return;
    try {
      await apiClient.blockUser(userId);
      const response = await apiClient.getBlocks();
      setBlockedUserIds(response.blockedUserIds);
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
      await apiClient.reportUser(userId, reason, notes);
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
    const user = await apiClient.getMe();

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
