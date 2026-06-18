import { classifyLeankCategory } from "@/appwrite/actions/leank.actions";
import { appwriteConfig, db } from "@/appwrite/config";
import CustomButton from "@/components/Button";
import Calendar from "@/components/Calendar";
import { ToggleItem } from "@/components/Toggle";
import { defaultCovers } from "@/constants/data";
import {
  LeankCategory,
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
import { Image } from "expo-image";
import { cssInterop } from "nativewind";
import { useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
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

const TIME_OPTIONS = Object.values(Time);

// Interop the Image component to recognize the 'className' prop (register once)
cssInterop(Image, {
  className: { target: "style" },
});

export default function Create() {
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
  const [pendingTime, setPendingTime] = useState<string>(TIME_OPTIONS[0]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isToggleEnabled, setIsToggleEnabled] = useState(false);
  const [modalContent, setModalContent] = useState<ModalType | null>(null);
  const { currentUser, displayToast } = useGlobalContext();

  const { uploadFiles } = useAppwriteUpload();

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
      if (!result || !Array.isArray(result) || result.length === 0) return;

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

  const updateCategoryAfterClassification = async (
    leankId: string,
    initialCategory: LeankCategory,
    leankTitle: string,
    leankDescription: string,
  ) => {
    try {
      const classifiedCategory = await classifyLeankCategory(
        leankTitle,
        leankDescription,
      );

      if (classifiedCategory && classifiedCategory !== initialCategory) {
        await db.updateRow({
          databaseId: appwriteConfig.db,
          tableId: appwriteConfig.tables.leanks,
          rowId: leankId,
          data: { category: classifiedCategory },
        });
      }
    } catch (error) {
      console.warn(
        "Could not update leank category after classification",
        error,
      );
    }
  };

  const onPostLeank = async () => {
    if (!title || !date) {
      return displayToast({
        type: ToastType.ERROR,
        description: `Please fill both Title and Date`,
      });
    }

    const classificationTitle = title;
    const classificationDescription = description;
    const fallbackCategory = LeankCategory.OTHER;

    showLoader("Posting leank...");

    let url = undefined;

    try {
      if (coverMediaResult) {
        url = (await uploadFiles([coverMediaResult], 3))[0]; // limit concurrency to 3
      }
    } catch {
      displayToast({
        type: ToastType.ERROR,
        description: "Could not upload cover. Please try again.",
      });
      hideLoader();
      return;
    }

    const data = {
      cover:
        url || defaultCovers[Math.floor(Math.random() * defaultCovers.length)],
      title,
      description,
      category: fallbackCategory,
      date,
      time,
      location: isToggleEnabled
        ? LocationFilterEnum.ONLINE
        : currentUser?.location,
      locationLat: isToggleEnabled ? null : (currentUser?.locationLat ?? null),
      locationLng: isToggleEnabled ? null : (currentUser?.locationLng ?? null),
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

      void updateCategoryAfterClassification(
        leank.$id,
        fallbackCategory,
        classificationTitle,
        classificationDescription,
      );
    } catch (e) {
      console.warn(e);
      displayToast({
        type: ToastType.ERROR,
        description: "Could not post leank. Please try again.",
      });
    } finally {
      hideLoader();
    }
  };

  const openModal = (type: ModalType) => {
    if (type === ModalType.TIME) {
      setPendingTime(time || TIME_OPTIONS[0]);
    }
    setModalContent(type);
    setModalVisible(true);
  };

  const resetModal = () => {
    setModalVisible(false);
  };

  const handleModalDoneClick = (modalContent: ModalType) => {
    switch (modalContent) {
      case ModalType.TIME: {
        const next = pendingTime || TIME_OPTIONS[0];
        setTime(next);
        break;
      }
    }
    resetModal();
  };

  const handleCloseTimeModal = () => {
    setPendingTime(time || TIME_OPTIONS[0]);
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
              <Text
                className={`font-plus-jakarta-regular flex-1 ml-2 ${
                  date ? "text-black-300" : "text-gray-400"
                }`}
              >
                {date
                  ? new Date(date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Pick date"}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-2">Time</Text>
            <TouchableOpacity
              onPress={() => openModal(ModalType.TIME)}
              className="h-14 flex-row items-center bg-gray-50 rounded-xl px-4 py-4 border border-gray-200"
            >
              <Ionicons name="time" size={20} />
              <Text
                className={`font-plus-jakarta-regular flex-1 ml-2 ${
                  time ? "text-black-300" : "text-gray-400"
                }`}
              >
                {time || "Time"}
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

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={resetModal}
      >
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
            <View
              className="bg-white"
              style={{
                paddingBottom: Math.max(insets.bottom, 16),
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
              }}
            >
              <View className="px-5 pt-5 pb-3 border-b border-gray-200 flex-row items-center justify-between">
                <Text className="text-lg font-semibold">Select a time</Text>
                <TouchableOpacity
                  onPress={handleCloseTimeModal}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={22} color="black" />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={{ maxHeight: 320 }}
                contentContainerStyle={{ paddingHorizontal: 20 }}
                showsVerticalScrollIndicator={false}
              >
                {TIME_OPTIONS.map((option) => {
                  const selected = (pendingTime || TIME_OPTIONS[0]) === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      onPress={() => {
                        setPendingTime(option);
                      }}
                      className={`flex-row items-center py-3 px-2 mt-2 rounded-xl ${
                        selected ? "bg-gray-100" : ""
                      }`}
                      activeOpacity={0.7}
                    >
                      <View
                        className={`w-5 h-5 rounded-full border items-center justify-center ${
                          selected ? "border-black" : "border-gray-400"
                        }`}
                      >
                        {selected && (
                          <View className="w-2.5 h-2.5 rounded-full bg-black" />
                        )}
                      </View>
                      <Text
                        className={`ml-3 text-base ${
                          selected
                            ? "font-semibold text-black"
                            : "text-gray-800"
                        }`}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View className="px-5 pt-3 pb-5">
                <CustomButton
                  label="Done"
                  onPress={() => {
                    handleModalDoneClick(modalContent);
                  }}
                />
              </View>
            </View>
          </View>
        )}
      </Modal>
    </Animated.ScrollView>
  );
}
