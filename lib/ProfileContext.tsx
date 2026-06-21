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
import { apiClient } from "./api/client";

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
  locationCoords: { lat: number; lng: number } | null;
  setAvatar: (avatar: any) => void;
  setAvatarMediaResult: (media: MediaResult) => void;
  setName: (name: string) => void;
  setEmail: (email: string) => void;
  setAge: (age: number) => void;
  setLocation: (location: string) => void;
  setLocationCoords: (coords: { lat: number; lng: number } | null) => void;

  // Actions
  handleSave: () => Promise<void>;
  handleCancel: () => void;
  resetUserData: () => void;
}

const EditProfileContext = createContext<EditProfileContextType | undefined>(
  undefined,
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
  const [locationCoords, setLocationCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(
    typeof currentUser?.locationLat === "number" &&
      typeof currentUser?.locationLng === "number"
      ? { lat: currentUser.locationLat, lng: currentUser.locationLng }
      : null,
  );
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
      location !== currentUser.location ||
      (locationCoords?.lat ?? null) !== (currentUser.locationLat ?? null) ||
      (locationCoords?.lng ?? null) !== (currentUser.locationLng ?? null);

    setHasChanges(changed);
  }, [avatar, name, email, age, location, locationCoords, currentUser]);

  // When currentUser becomes available, sync local state
  useEffect(() => {
    if (!currentUser) return;
    setAvatar(currentUser.avatar);
    setName(currentUser.name);
    setEmail(currentUser.email);
    setAge(currentUser.age);
    setLocation(currentUser.location);
    setLocationCoords(
      typeof currentUser.locationLat === "number" &&
        typeof currentUser.locationLng === "number"
        ? { lat: currentUser.locationLat, lng: currentUser.locationLng }
        : null,
    );
  }, [currentUser]);

  const resetUserData = () => {
    if (!currentUser) return;
    setAvatar(currentUser.avatar);
    setName(currentUser.name);
    setEmail(currentUser.email);
    setAge(currentUser.age);
    setLocation(currentUser.location);
    setLocationCoords(
      typeof currentUser.locationLat === "number" &&
        typeof currentUser.locationLng === "number"
        ? { lat: currentUser.locationLat, lng: currentUser.locationLng }
        : null,
    );
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
      let avatarFileId: string | undefined;

      if (avatarMediaResult) {
        avatarFileId = (await uploadFiles([avatarMediaResult], 1, "avatar"))[0]
          .fileId;
      }

      await apiClient.updateMe({
        avatarFileId,
        name,
        age,
        location,
        locationLat: locationCoords?.lat,
        locationLng: locationCoords?.lng,
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
        locationCoords,
        setAvatar,
        setAvatarMediaResult,
        setName,
        setEmail,
        setAge,
        setLocation,
        setLocationCoords,

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
      "useEditProfile must be used within an EditProfileProvider",
    );
  }
  return context;
}
