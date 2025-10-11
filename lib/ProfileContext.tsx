import { user } from "@/constants/data";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

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
  age: string;
  location: string;
  setAvatar: (avatar: any) => void;
  setName: (name: string) => void;
  setEmail: (email: string) => void;
  setAge: (age: string) => void;
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
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // User data state
  const [avatar, setAvatar] = useState(user?.avatar);
  const [name, setName] = useState(user?.name);
  const [age, setAge] = useState("21");
  const [location, setLocation] = useState("Syracuse");
  const [email, setEmail] = useState(user?.email);

  // Track changes to enable/disable save button
  useEffect(() => {
    const hasChanges =
      avatar !== user?.avatar || name !== user?.name || email !== user?.email; // TODO: add age and location from user here as well
    setHasChanges(hasChanges);
  }, [avatar, name, email]);

  const resetUserData = () => {
    setAvatar(user?.avatar);
    setName(user?.name);
    setEmail(user?.email);
    setAge("21"); //TODO: update to users actual age and location
    setLocation("Syracuse");
  };

  const handleSave = async () => {
    if (!isEditing || isSaving) return;

    setIsSaving(true);
    try {
      // Add actual save logic here (API calls, etc.)
      console.log("Saving profile...");

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setIsEditing(false);
      setHasChanges(false);
    } catch (error) {
      console.error("Save failed:", error);
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
