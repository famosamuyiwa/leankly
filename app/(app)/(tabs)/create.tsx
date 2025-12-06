import { appwriteConfig, db } from "@/appwrite/config";
import CustomButton from "@/components/Button";
import Calendar from "@/components/Calendar";
import { ToggleItem } from "@/components/Toggle";
import { defaultCovers } from "@/constants/data";
import {
  LeankStatus,
  LocationFilterEnum,
  Time,
  ToastType,
} from "@/constants/enums";
import { useAppwriteUpload } from "@/hooks/useBucket";
import useImagePicker from "@/hooks/useImagePicker";
import { MediaResult } from "@/interfaces";
import { useGlobalContext } from "@/lib/GlobalContext";
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { Image } from "expo-image";
import { cssInterop } from "nativewind";
import { useMemo, useState } from "react";
import {
  Button,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ID } from "react-native-appwrite";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

enum ModalType {
  CALENDAR = "calendar",
  TIME = "time",
}

export default function Create() {
  // Interop the Image component to recognize the 'className' prop
  cssInterop(Image, {
    className: { target: "style" },
  });

  const insets = useSafeAreaInsets();

  const [cover, setCover] = useState("");
  const [coverMediaResult, setCoverMediaResult] = useState<
    MediaResult | undefined
  >(undefined);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { pickMultimedia } = useImagePicker();
  const { showLoader, hideLoader } = useGlobalContext();
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [isToggleEnabled, setIsToggleEnabled] = useState(false);
  const [modalContent, setModalContent] = useState<ModalType | null>(null);
  const { currentUser, displayToast } = useGlobalContext();

  const { uploadFiles, progress, isUploading } = useAppwriteUpload();

  const memoizedCover = useMemo(() => {
    return cover ? (
      <Image
        source={{ uri: cover }}
        className="w-full h-full rounded-3xl"
        contentFit="cover"
        transition={300}
      />
    ) : (
      <View className="bg-gray-100 w-full h-full rounded-3xl items-center justify-center">
        <MaterialCommunityIcons
          name="image-size-select-actual"
          size={50}
          color={"darkgrey"}
        />
      </View>
    );
  }, [cover]);

  const handleCoverPress = async () => {
    try {
      const result: any = await pickMultimedia(false, true);
      setCover(result[0].uri);
      setCoverMediaResult(result[0]);
    } catch (e) {
      console.log(e);
    }
  };

  const handleOnCalendarModalDismiss = (date: Date | undefined) => {
    if (date) {
      setDate(date);
    }
    resetModal();
  };

  const reset = () => {
    setCover("");
    setTitle("");
    setDescription("");
    setDate(undefined);
    setTime("");
    setIsToggleEnabled(false);
  };

  const onPostLeank = async () => {
    if (!title || !date) {
      return displayToast({
        type: ToastType.ERROR,
        description: `Please fill both Title and Date`,
      });
    }

    showLoader("Posting leank...");

    let url = undefined;

    if (coverMediaResult) {
      url = (await uploadFiles([coverMediaResult], 3))[0]; // limit concurrency to 3
    }

    const data = {
      cover:
        url || defaultCovers[Math.floor(Math.random() * defaultCovers.length)],
      title,
      description,
      date,
      time,
      location: isToggleEnabled
        ? LocationFilterEnum.ONLINE
        : currentUser?.location,
      locationLat: isToggleEnabled ? null : currentUser?.locationLat ?? null,
      locationLng: isToggleEnabled ? null : currentUser?.locationLng ?? null,
      status: LeankStatus.ACTIVE,
      ownerId: currentUser?.$id,
      owner: currentUser?.$id,
    };

    try {
      const leank = await db.createRow({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.leanks,
        rowId: ID.unique(),
        data,
      });

      displayToast({
        type: ToastType.SUCCESS,
        description: `Leank has been posted successfully!`,
      });

      reset();
    } catch (e) {
      console.warn(e);
    } finally {
      hideLoader();
    }
  };

  const openModal = (type: ModalType) => {
    setModalContent(type);
    setModalVisible(true);
  };

  const resetModal = () => {
    setModalVisible(false);
  };

  const handleModalDoneClick = (modalContent: ModalType) => {
    switch (modalContent) {
      case ModalType.TIME:
        if (!time) {
          setTime(Object.values(Time)[0]);
        }
    }
    resetModal();
  };

  if (!insets) {
    return null; // Prevents glitching by waiting for insets
  }

  return (
    <Animated.ScrollView
      layout={LinearTransition}
      entering={FadeIn.duration(500)}
      className="bg-white px-5 pt-5"
    >
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={handleCoverPress}
        className="h-52"
      >
        {memoizedCover}
        {cover && (
          <View className="absolute bottom-0 right-0 p-1 rounded-full bg-white">
            <MaterialIcons name="camera-enhance" size={24} />
          </View>
        )}
      </TouchableOpacity>

      <View className="py-5 gap-5">
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-2">Title</Text>
          <View className=" h-14 bg-gray-50 rounded-xl px-4 py-4 border border-gray-200">
            <TextInput
              value={title}
              autoCapitalize="none"
              placeholder='e.g "Study session at my house?" '
              placeholderTextColor="#9CA3AF"
              className="p-0 "
              onChangeText={setTitle}
            />
          </View>
        </View>

        <View>
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Description
          </Text>
          <View className="h-20 bg-gray-50 rounded-xl px-4 py-4 border border-gray-200">
            <TextInput
              value={description}
              autoCapitalize="none"
              placeholder='e.g "going through a lot rn. Who wants to join me in studying?" '
              multiline
              numberOfLines={3}
              placeholderTextColor="#9CA3AF"
              className="p-0 "
              onChangeText={setDescription}
            />
          </View>
        </View>

        <View className="flex-row gap-5">
          <View className="w-[60%]">
            <Text className="text-sm font-medium text-gray-700 mb-2">Date</Text>
            <TouchableOpacity
              onPress={() => openModal(ModalType.CALENDAR)}
              className="h-14 flex-row items-center bg-gray-50 rounded-xl px-4 py-4 border border-gray-200"
            >
              <Ionicons name="calendar" size={20} />
              <Text className="font-plus-jakarta-regular flex-1 ml-2">
                {date &&
                  new Date(date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-2">Time</Text>
            <TouchableOpacity
              onPress={() => openModal(ModalType.TIME)}
              className="h-14 flex-row items-center bg-gray-50 rounded-xl px-4 py-4 border border-gray-200"
            >
              {/* <Ionicons name="time" size={20} /> */}
              <Text className="font-plus-jakarta-regular flex-1 ml-2">
                {time}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ToggleItem
          title="Online"
          isToggleEnabled={isToggleEnabled}
          setIsToggleEnabled={setIsToggleEnabled}
        />
        <CustomButton label="Post Leank" onPress={onPostLeank} />
      </View>

      <Modal visible={modalVisible} transparent animationType="slide">
        {modalContent === ModalType.CALENDAR && (
          <View
            style={{
              paddingTop: insets.top,
            }}
            className="flex-1 justify-end color-black"
          >
            <Calendar onBack={handleOnCalendarModalDismiss} />
          </View>
        )}

        {modalContent === ModalType.TIME && (
          <View className="flex-1 justify-end bg-black/10">
            <View className="bg-white pb-5">
              <Picker
                selectedValue={time}
                onValueChange={setTime}
                itemStyle={{
                  color: "black", // Set text color
                  fontSize: 18, // Set font size
                }}
              >
                {Object.values(Time).map((type: any) => (
                  <Picker.Item key={type} label={type} value={type} />
                ))}
              </Picker>
              <Button
                title="Done"
                onPress={() => {
                  handleModalDoneClick(modalContent);
                }}
              />
            </View>
          </View>
        )}
      </Modal>
    </Animated.ScrollView>
  );
}
