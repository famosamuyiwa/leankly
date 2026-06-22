import { ImagePickerMediaTypes } from "@/constants/common";
import { MediaResult } from "@/interfaces";
import * as MediaPicker from "expo-image-picker";
import { MediaType } from "expo-image-picker";
import { useState } from "react";
import { useAppwriteUpload } from "./useBucket";

const useImagePicker = () => {
  const [mediaResults, setMediaResults] = useState<MediaResult[]>([]);
  const { uploadFiles } = useAppwriteUpload();

  async function pickMultimedia(
    isUpload: boolean,
    editable?: boolean,
    allowMultiple?: boolean,
    mediaType?: MediaType | MediaType[],
  ) {
    return new Promise(async (resolve, reject) => {
      // No permissions request is necessary for launching the image library
      let result: any = await MediaPicker.launchImageLibraryAsync({
        mediaTypes: mediaType ?? ImagePickerMediaTypes.Images,
        allowsEditing: editable,
        aspect: [1, 1],
        quality: 1,
        allowsMultipleSelection: allowMultiple,
      });
      if (result.canceled) return resolve(null);

      const newMedia: MediaResult[] = result.assets.map((asset: any) => ({
        uri: asset.uri,
        type: asset.mimeType,
        size: asset.fileSize,
      }));

      setMediaResults((prevResults) => [...prevResults, ...newMedia]);

      if (isUpload) {
        try {
          //Upload each image and collect URLs
          const uploaded = await uploadFiles(newMedia, 3);

          setMediaResults([]);
          // Return promise resolve on successful upload
          resolve({
            urls: uploaded.map((item) => item.url),
          });
        } catch (error) {
          reject(error);
        }
      } else {
        resolve(newMedia);
      }
    });
  }

  return { mediaResults, pickMultimedia, setMediaResults };
};

export default useImagePicker;
