import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { Text, View } from "react-native";
import CustomButton from "./Button";
import DateWheelPicker from "./DateWheelPicker";

export interface DatePickerBottomSheetHandle {
  close: () => void;
  snapToIndex: (index: number) => void;
}

interface DatePickerBottomSheetProps {
  value: Date;
  onChange: (value: Date) => void;
  onDone: () => void;
  onClose?: () => void;
}

const formatDatePreview = (date: Date) =>
  date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const DatePickerBottomSheet = forwardRef<
  DatePickerBottomSheetHandle,
  DatePickerBottomSheetProps
>(function DatePickerBottomSheet({ value, onChange, onDone, onClose }, ref) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => [430], []);
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.3}
      />
    ),
    [],
  );

  useImperativeHandle(ref, () => ({
    close: () => bottomSheetRef.current?.close(),
    snapToIndex: (index: number) => bottomSheetRef.current?.snapToIndex(index),
  }));

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      animateOnMount={false}
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      handleStyle={{
        borderTopLeftRadius: 100,
        borderTopRightRadius: 100,
      }}
      handleIndicatorStyle={{ backgroundColor: "lightgrey" }}
      onClose={onClose}
    >
      <BottomSheetView className="px-5 pb-10">
        <Text className="text-5xl">📅</Text>

        <View className="items-center">
          <Text className="text-xs font-plus-jakarta-semibold uppercase text-gray-400">
            Date
          </Text>
          <Text className="mt-1 text-3xl font-plus-jakarta-bold text-black">
            {formatDatePreview(value)}
          </Text>
        </View>

        <DateWheelPicker value={value} onChange={onChange} />

        <View className="pt-8">
          <CustomButton label="Done" onPress={onDone} />
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
});

export default DatePickerBottomSheet;
