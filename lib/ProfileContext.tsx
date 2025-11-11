import { appwriteConfig, db } from "@/appwrite/config";
import { ToastType } from "@/constants/enums";
import { useAppwriteUpload } from "@/hooks/useBucket";
import { MediaResult } from "@/interfaces";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useGlobalContext } from "./GlobalContext";

interface EditProfileContextType {
  // Editing state
  isEditing: boolean;
  isSaving: boolean;
  hasChanges: boolean;
  setIsEditing: (editing: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  setHasChanges: (changes: boolean) => void;

  // User data state
  avatar: any;
  name: string;
  email: string;
  age: number;
  location: string;
  setAvatar: (avatar: any) => void;
  setAvatarMediaResult: (media: MediaResult) => void;
  setName: (name: string) => void;
  setEmail: (email: string) => void;
  setAge: (age: number) => void;
  setLocation: (location: string) => void;

  // Actions
  handleSave: () => Promise<void>;
  handleCancel: () => void;
  resetUserData: () => void;
}

const EditProfileContext = createContext<EditProfileContextType | undefined>(
  undefined
);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { currentUser, refetchCurrentUser, displayToast } = useGlobalContext();
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // User data state (initialize safely before currentUser is ready)
  const [avatar, setAvatar] = useState(currentUser?.avatar ?? "");
  const [avatarMediaResult, setAvatarMediaResult] = useState<
    MediaResult | undefined
  >(undefined);
  const [name, setName] = useState(currentUser?.name ?? "");
  const [age, setAge] = useState<number>(currentUser?.age ?? 0);
  const [location, setLocation] = useState(currentUser?.location ?? "");
  const [email, setEmail] = useState(currentUser?.email ?? "");
  const { uploadFiles, progress, isUploading } = useAppwriteUpload();

  // Track changes to enable/disable save button
  useEffect(() => {
    if (!currentUser) {
      setHasChanges(false);
      return;
    }

    const changed =
      avatar !== currentUser.avatar ||
      name !== currentUser.name ||
      email !== currentUser.email ||
      age !== currentUser.age ||
      location !== currentUser.location;

    setHasChanges(changed);
  }, [avatar, name, email, age, location, currentUser]);

  // When currentUser becomes available, sync local state
  useEffect(() => {
    if (!currentUser) return;
    setAvatar(currentUser.avatar);
    setName(currentUser.name);
    setEmail(currentUser.email);
    setAge(currentUser.age);
    setLocation(currentUser.location);
  }, [currentUser]);

  const resetUserData = () => {
    if (!currentUser) return;
    setAvatar(currentUser.avatar);
    setName(currentUser.name);
    setEmail(currentUser.email);
    setAge(currentUser.age);
    setLocation(currentUser.location);
  };

  const handleSave = async () => {
    if (!isEditing || isSaving) return;

    if (!name) {
      return displayToast({
        type: ToastType.ERROR,
        description: "Name cannot be empty",
      });
    }
    if (!age || age < 16) {
      return displayToast({
        type: ToastType.ERROR,
        description: "Age cannot be empty or less than 16",
      });
    }

    setIsSaving(true);
    try {
      if (!currentUser) return;
      let url = undefined;

      if (avatarMediaResult) {
        url = (await uploadFiles([avatarMediaResult], 3))[0]; // limit concurrency to 3
      }

      await db.updateRow({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.user,
        rowId: currentUser.$id,
        data: {
          avatar: url || currentUser.avatar,
          name,
          email,
          age,
          location,
        },
      });

      refetchCurrentUser();
      setIsEditing(false);
      setHasChanges(false);
    } catch (err: any) {
      console.log(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isSaving) return;
    if (isEditing) resetUserData();
    setIsEditing(false);
    setHasChanges(false);
  };

  return (
    <EditProfileContext.Provider
      value={{
        // Editing state
        isEditing,
        isSaving,
        hasChanges,
        setIsEditing,
        setIsSaving,
        setHasChanges,

        // User data state
        avatar,
        name,
        email,
        age,
        location,
        setAvatar,
        setAvatarMediaResult,
        setName,
        setEmail,
        setAge,
        setLocation,

        // Actions
        handleSave,
        handleCancel,
        resetUserData,
      }}
    >
      {children}
    </EditProfileContext.Provider>
  );
}

export function useProfileContext() {
  const context = useContext(EditProfileContext);
  if (context === undefined) {
    throw new Error(
      "useEditProfile must be used within an EditProfileProvider"
    );
  }
  return context;
}
