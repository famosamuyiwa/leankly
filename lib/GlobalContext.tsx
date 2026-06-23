import { Toast } from "@/components/animation-toast/components";
import Loader from "@/components/Loader";
import UserPreviewModal from "@/components/UserPreviewModal";
import { BasicUser, ToastProps, User } from "@/interfaces";
import { apiClient } from "@/lib/api/client";
import { AttentionCountsResponse } from "@/lib/api/types";
import { realtime } from "@/lib/api/realtime";
import * as Notifications from "expo-notifications";
import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

interface GlobalContextType {
  currentUser: User | undefined;
  unreadCount: number;
  unreadChatCount: number;
  pendingRequestCount: number;
  attentionCount: number;
  refetchCurrentUser: () => void;
  setUnreadCount: (val: number) => void;
  setPendingRequestCount: (val: number) => void;
  setAttentionCounts: (counts: AttentionCountsResponse) => void;
  refreshAttentionCounts: () => Promise<void>;
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
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | undefined>(undefined);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [previewUser, setPreviewUser] = useState<BasicUser | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const toastRef = useRef<any>({});
  const loaderRef = useRef<any>({});
  const currentUserId = currentUser?.id;
  const attentionCount = unreadChatCount + pendingRequestCount;

  const setUnreadCount = useCallback((value: number) => {
    setUnreadChatCount(value);
  }, []);

  const setAttentionCounts = useCallback((counts: AttentionCountsResponse) => {
    setUnreadChatCount(counts.unreadChatCount);
    setPendingRequestCount(counts.pendingRequestCount);
  }, []);

  const refreshAttentionCounts = useCallback(async () => {
    if (!currentUserId) return;
    const counts = await apiClient.getAttentionCounts();
    setAttentionCounts(counts);
  }, [currentUserId, setAttentionCounts]);

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

    const fetchAttentionCounts = async () => {
      try {
        const counts = await apiClient.getAttentionCounts();

        if (isMounted) {
          setAttentionCounts(counts);
        }
      } catch (e) {
        console.error(e);
      }
    };

    void loadBlocked();
    void fetchAttentionCounts();

    // optional cleanup (if you want to cancel or reset state later)
    return () => {
      isMounted = false;
      setUnreadCount(0);
      setPendingRequestCount(0);
    };
  }, [currentUserId, setAttentionCounts, setUnreadCount]);

  useEffect(() => {
    if (!currentUserId) return;
    const unsubscribers = [
      realtime.subscribe("attention.changed", () => {
        void refreshAttentionCounts().catch(() => {});
      }),
      realtime.subscribe("chatMeta.updated", () => {
        void refreshAttentionCounts().catch(() => {});
      }),
      realtime.subscribe("unread.changed", () => {
        void refreshAttentionCounts().catch(() => {});
      }),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [currentUserId, refreshAttentionCounts]);

  useEffect(() => {
    if (Platform.OS !== "ios" && Platform.OS !== "android") return;
    const count = currentUserId ? attentionCount : 0;
    void Notifications.setBadgeCountAsync(count).catch((error) => {
      console.warn("Failed to update app badge count", error);
    });
  }, [attentionCount, currentUserId]);

  const blockUser = async (userId: string) => {
    if (!userId || userId === currentUser?.id) return;
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
    if (!user?.id || user.id === currentUser?.id) return;
    setPreviewUser(user);
    setShowPreview(true);
  };

  const reportUser = async (userId: string, reason: string, notes?: string) => {
    if (!currentUser?.id || !userId || !reason) return;
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
      setCurrentUser(user);
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
        unreadCount: unreadChatCount,
        unreadChatCount,
        pendingRequestCount,
        attentionCount,
        currentUser,
        refetchCurrentUser,
        setCurrentUser,
        setUnreadCount,
        setPendingRequestCount,
        setAttentionCounts,
        refreshAttentionCounts,
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
        disableBlock={previewUser?.id === currentUser?.id}
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
