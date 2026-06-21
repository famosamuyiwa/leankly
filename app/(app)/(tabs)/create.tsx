import CustomButton from "@/components/Button";
import DatePickerBottomSheet, {
  DatePickerBottomSheetHandle,
} from "@/components/DatePickerBottomSheet";
import TimePickerBottomSheet, {
  TimePickerBottomSheetHandle,
} from "@/components/TimePickerBottomSheet";
import { ToggleItem } from "@/components/Toggle";
import { Time, ToastType } from "@/constants/enums";
import { useAppwriteUpload } from "@/hooks/useBucket";
import useImagePicker from "@/hooks/useImagePicker";
import { MediaResult } from "@/interfaces";
import { useGlobalContext } from "@/lib/GlobalContext";
import { apiClient } from "@/lib/api/client";
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { Portal } from "@gorhom/portal";
import { Image } from "expo-image";
import { cssInterop } from "nativewind";
import { useMemo, useRef, useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const TIME_OPTIONS = Object.values(Time);

const getToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

// Interop the Image component to recognize the 'className' prop (register once)
cssInterop(Image, {
  className: { target: "style" },
});

export default function Create() {
  const [cover, setCover] = useState("");
  const [coverMediaResult, setCoverMediaResult] = useState<
    MediaResult | undefined
  >(undefined);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { pickMultimedia } = useImagePicker();
  const { showLoader, hideLoader } = useGlobalContext();
  const [date, setDate] = useState<Date | undefined>();
  const [pendingDate, setPendingDate] = useState<Date>(() => getToday());
  const [time, setTime] = useState("");
  const [pendingTime, setPendingTime] = useState<string>(TIME_OPTIONS[0]);
  const [isToggleEnabled, setIsToggleEnabled] = useState(false);
  const dateBottomSheetRef = useRef<DatePickerBottomSheetHandle>(null);
  const timeBottomSheetRef = useRef<TimePickerBottomSheetHandle>(null);
  const didCommitDateRef = useRef(false);
  const didCommitTimeRef = useRef(false);
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

    let coverFileId: string | undefined;

    try {
      if (coverMediaResult) {
        coverFileId = (
          await uploadFiles([coverMediaResult], 1, "leank_cover")
        )[0].fileId;
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
      coverFileId,
      title,
      description,
      date: date.toISOString(),
      time,
      isOnline: isToggleEnabled,
      location: isToggleEnabled ? undefined : currentUser?.location,
      locationLat: isToggleEnabled ? undefined : currentUser?.locationLat,
      locationLng: isToggleEnabled ? undefined : currentUser?.locationLng,
      peopleRequired: 1,
    };

    try {
      await apiClient.createLeank(data);

      displayToast({
        type: ToastType.SUCCESS,
        description: `Leank has been posted successfully!`,
      });

      reset();
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

  const openDateSheet = () => {
    didCommitDateRef.current = false;
    setPendingDate(date || getToday());
    requestAnimationFrame(() => {
      dateBottomSheetRef.current?.snapToIndex(0);
    });
  };

  const openTimeSheet = () => {
    didCommitTimeRef.current = false;
    setPendingTime(time || TIME_OPTIONS[0]);
    requestAnimationFrame(() => {
      timeBottomSheetRef.current?.snapToIndex(0);
    });
  };

  const handleDateSheetDone = () => {
    didCommitDateRef.current = true;
    setDate(pendingDate);
    dateBottomSheetRef.current?.close();
  };

  const handleDateSheetClose = () => {
    if (!didCommitDateRef.current) {
      setPendingDate(date || getToday());
    }

    didCommitDateRef.current = false;
  };

  const handleTimeSheetDone = () => {
    didCommitTimeRef.current = true;
    setTime(pendingTime || TIME_OPTIONS[0]);
    timeBottomSheetRef.current?.close();
  };

  const handleTimeSheetClose = () => {
    if (!didCommitTimeRef.current) {
      setPendingTime(time || TIME_OPTIONS[0]);
    }

    didCommitTimeRef.current = false;
  };

  return (
    <>
      <ScrollView className="bg-white px-5 pt-5">
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={handleCoverPress}
          className="h-64"
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
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Title
            </Text>
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
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Date
              </Text>
              <TouchableOpacity
                onPress={openDateSheet}
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
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Time
              </Text>
              <TouchableOpacity
                onPress={openTimeSheet}
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
      </ScrollView>

      <Portal>
        <DatePickerBottomSheet
          ref={dateBottomSheetRef}
          value={pendingDate}
          onChange={setPendingDate}
          onDone={handleDateSheetDone}
          onClose={handleDateSheetClose}
        />
        <TimePickerBottomSheet
          ref={timeBottomSheetRef}
          value={pendingTime || TIME_OPTIONS[0]}
          onChange={setPendingTime}
          onDone={handleTimeSheetDone}
          onClose={handleTimeSheetClose}
        />
      </Portal>
    </>
  );
}
