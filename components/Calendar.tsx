import { CalendarRangeTheme } from "@/constants/common";
import { Ionicons } from "@expo/vector-icons";
import {
  Calendar as FlashCalendar,
  fromDateId,
  toDateId,
} from "@marceloterreiro/flash-calendar";
import { memo, useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CalendarProps {
  onBack: (date: Date | undefined) => void;
}

// Memoized header component to prevent unnecessary re-renders
const Header = memo(({ onBack }: { onBack: () => void }) => (
  <View className="mb-8 items-center justify-center w-11/12">
    <TouchableOpacity onPress={onBack} className="absolute -left-2">
      <Ionicons name="arrow-back-circle-sharp" size={40} />
    </TouchableOpacity>
    <Text className="font-plus-jakarta-bold text-lg">Calendar</Text>
    <View />
  </View>
));

export default function Calendar({ onBack }: CalendarProps) {
  const insets = useSafeAreaInsets();

  if (!insets) {
    return null; // Prevents glitching by waiting for insets
  }

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const today = useMemo(() => toDateId(new Date()), []);

  // Memoize back handler
  const handleOnBack = useCallback(() => {
    if (selectedDate) {
      onBack(fromDateId(selectedDate));
    } else {
      onBack(undefined);
    }
  }, [selectedDate, onBack]);

  // Memoize calendar component props
  const calendarProps = useMemo(
    () => ({
      calendarMonthId: today,
      calendarActiveDateRanges: selectedDate
        ? [
            {
              startId: selectedDate,
              endId: selectedDate,
            },
          ]
        : [],
      onCalendarDayPress: setSelectedDate,
      calendarColorScheme: "light" as const,
      theme: CalendarRangeTheme,
      calendarMinDateId: today,
    }),
    [today, selectedDate]
  );

  return (
    <View style={[styles.container]}>
      <Header onBack={handleOnBack} />
      <View style={styles.calendarContainer}>
        <FlashCalendar.List {...calendarProps} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarContainer: {
    flex: 1,
    width: "100%",
  },
});
