import { appwriteConfig, storage } from "@/appwrite/config";
import { getAppwriteResourceId } from "@/appwrite/adapters";
import { MediaResult } from "@/interfaces";
import { apiClient } from "@/lib/api/client";
import * as ImageManipulator from "expo-image-manipulator";
import { useState } from "react";
import { ID } from "react-native-appwrite";

export type UploadPurpose = "avatar" | "leank_cover";
export type UploadedFile = { fileId: string; url: string };

export function useAppwriteUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = async (
    files: MediaResult[],
    concurrency = 4,
    purpose: UploadPurpose = "leank_cover",
  ): Promise<UploadedFile[]> => {
    setError(null);
    setProgress(0);
    setIsUploading(true);
    const bucketId =
      purpose === "avatar"
        ? appwriteConfig.avatarBucket
        : appwriteConfig.leankCoverBucket;
    if (!bucketId)
      throw new Error(`Storage bucket for ${purpose} is not configured`);
    let nextIndex = 0;
    let completed = 0;
    const output: UploadedFile[] = new Array(files.length);

    const worker = async () => {
      while (nextIndex < files.length) {
        const index = nextIndex++;
        const source = files[index];
        const compressed = await ImageManipulator.manipulateAsync(
          source.uri,
          [{ resize: { width: 1080 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
        );
        const uploaded = await storage.createFile({
          bucketId,
          fileId: ID.unique(),
          file: {
            uri: compressed.uri,
            name: source.name || `upload_${Date.now()}_${index}.jpg`,
            type: "image/jpeg",
            size: source.size || 0,
          },
        });
        const fileId = getAppwriteResourceId(uploaded);
        const confirmed = await apiClient.confirmMedia({
          fileId,
          bucket: purpose === "avatar" ? "avatars" : "leank_covers",
          purpose,
        });
        output[index] = { fileId, url: confirmed.viewUrl };
        completed += 1;
        setProgress(Math.round((completed / files.length) * 100));
      }
    };

    try {
      await Promise.all(
        Array.from({ length: Math.min(concurrency, files.length) }, worker),
      );
      return output;
    } catch (cause: any) {
      setError(cause?.message || "Upload failed");
      throw cause;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFiles, isUploading, progress, error };
}
