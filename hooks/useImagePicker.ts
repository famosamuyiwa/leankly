import { ImagePickerMediaTypes } from "@/constants/common";
import * as MediaPicker from "expo-image-picker";
import { MediaType } from "expo-image-picker";
import { useState } from "react";

interface MediaResult {
  uri: string[];
}

const useImagePicker = () => {
  const [imageUris, setImageUris] = useState<string[]>([]);

  async function pickMultimedia(
    isUpload: boolean,
    editable?: boolean,
    allowMultiple?: boolean,
    mediaType?: MediaType | MediaType[]
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

      const newMedia: MediaResult = {
        uri: result.assets.map((asset: any) => asset.uri),
      };

      setImageUris((prevImages) => [...prevImages, ...newMedia.uri]);

      if (isUpload) {
        try {
          // Upload each image and collect URLs
          // const uploadPromises = newMedia.uri.map((uri: string) =>
          //   uploadToR2(uri)
          // );
          // const downloadUrls = await Promise.all(uploadPromises);
          // setImageUris([]);
          // // Return promise resolve on successful upload
          // resolve({
          //   downloadUrls,
          // });
        } catch (error) {
          reject(error);
        }
      } else {
        resolve(newMedia);
      }
    });
  }

  return { imageUris, pickMultimedia, setImageUris };
};

export default useImagePicker;
