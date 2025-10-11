import CustomButton from "@/components/Button";
import Calendar from "@/components/Calendar";
import { ToggleItem } from "@/components/Toggle";
import { Time } from "@/constants/enums";
import useImagePicker from "@/hooks/useImagePicker";
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
  if (!insets) {
    return null; // Prevents glitching by waiting for insets
  }

  const [cover, setCover] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const { pickMultimedia } = useImagePicker();
  const { showLoader, hideLoader } = useGlobalContext();
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState<ModalType | null>(null);

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
      const image: any = await pickMultimedia(false, true);
      setCover(image.uri[0]);
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

  const onPostLeank = () => {
    showLoader("Posting leank...");
    setTimeout(hideLoader, 3000);
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
              value={email}
              autoCapitalize="none"
              placeholder='e.g "Study session at my house?" '
              placeholderTextColor="#9CA3AF"
              onChangeText={setEmail}
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

        <ToggleItem title="Online" />
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
