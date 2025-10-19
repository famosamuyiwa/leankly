import { appwriteConfig, storage } from "@/appwrite/config";
import { MediaResult } from "@/interfaces";
import * as ImageManipulator from "expo-image-manipulator";
import { useState } from "react";
import { ID } from "react-native-appwrite";

/* ---------------------------------------------
   🧩  useAppwriteUpload Hook
---------------------------------------------- */
export function useAppwriteUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const bucketId = appwriteConfig.storage;

  /* -------------------------------------------------
     🔸 Helper – Compress single image before upload
  --------------------------------------------------- */
  const compressImage = async (uri: string) => {
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1080 } }], // adjust as needed
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      return manipulated.uri;
    } catch (err) {
      console.warn("Image compression failed:", err);
      return uri; // fallback to original
    }
  };

  /* -------------------------------------------------
     🚀 Upload Handler (supports multi-upload)
  --------------------------------------------------- */
  const uploadFiles = async (
    files: MediaResult[],
    concurrency = 4 // safe default for mobile
  ): Promise<URL[]> => {
    setError(null);
    setProgress(0);
    setIsUploading(true);

    try {
      const uploadedUrls: URL[] = [];
      let completed = 0;

      // Helper: single file upload
      const uploadSingle = async (file: {
        uri: string;
        name?: string;
        type?: string;
        size?: any;
      }) => {
        try {
          const result = await storage.createFile({
            bucketId,
            fileId: ID.unique(),
            file: {
              uri: file.uri,
              name: file.name || `upload_${Date.now()}.jpg`,
              type: file.type || "image/jpeg",
              size: file.size || 0,
            },
          });

          const fileUrl = storage.getFileViewURL(bucketId, result.$id);

          uploadedUrls.push(fileUrl);

          completed++;
          setProgress(Math.round((completed / files.length) * 100));
        } catch (err: any) {
          console.warn(`⚠️ Failed to upload ${file.name || file.uri}:`, err);
          throw err;
        }
      };

      // Concurrency limiter
      const chunks: Promise<void>[] = [];
      let active = 0;
      let index = 0;

      const next = async () => {
        if (index >= files.length) return;
        const current = files[index++];
        active++;
        await uploadSingle(current);
        active--;
        if (index < files.length) await next();
      };

      // Start limited concurrent uploads
      const initial = Math.min(concurrency, files.length);
      for (let i = 0; i < initial; i++) {
        chunks.push(next());
      }

      await Promise.all(chunks);

      setIsUploading(false);
      return uploadedUrls;
    } catch (err: any) {
      console.error("❌ Upload failed:", err);
      setError(err.message || "Upload failed");
      setIsUploading(false);
      throw err;
    }
  };

  return { uploadFiles, isUploading, progress, error };
}
