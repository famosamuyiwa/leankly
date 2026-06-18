import { Picker } from "@react-native-picker/picker";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

const DEFAULT_TIME = "12:00 AM";
const HOURS = ["12", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];
const MINUTE_TENS = ["0", "1", "2", "3", "4", "5"];
const MINUTE_ONES = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const PERIODS = ["AM", "PM"];

type TimePeriod = (typeof PERIODS)[number];

interface TimeParts {
  hour: string;
  minuteTens: string;
  minuteOnes: string;
  period: TimePeriod;
}

interface TimeWheelPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const pickerItemStyle = {
  fontFamily: "Plus-Jakarta-SemiBold",
  fontSize: 20,
  color: "black",
};

const parseTimeParts = (value: string): TimeParts => {
  const normalized = value?.trim() || DEFAULT_TIME;
  const match = normalized.match(/^(\d{1,2}):([0-5]\d)\s?(AM|PM)$/i);

  if (!match) {
    return {
      hour: "12",
      minuteTens: "0",
      minuteOnes: "0",
      period: "AM",
    };
  }

  const [, rawHour, rawMinutes, rawPeriod] = match;
  const hour = String(Number(rawHour));

  if (!HOURS.includes(hour)) {
    return {
      hour: "12",
      minuteTens: "0",
      minuteOnes: "0",
      period: "AM",
    };
  }

  return {
    hour,
    minuteTens: rawMinutes[0],
    minuteOnes: rawMinutes[1],
    period: rawPeriod.toUpperCase() as TimePeriod,
  };
};

const formatTimeParts = ({ hour, minuteTens, minuteOnes, period }: TimeParts) =>
  `${hour}:${minuteTens}${minuteOnes} ${period}`;

const arePartsEqual = (a: TimeParts, b: TimeParts) =>
  a.hour === b.hour &&
  a.minuteTens === b.minuteTens &&
  a.minuteOnes === b.minuteOnes &&
  a.period === b.period;

const Rail = memo(function Rail({
  flex,
  selectedValue,
  values,
  onValueChange,
}: {
  flex: number;
  selectedValue: string;
  values: string[];
  onValueChange: (value: string) => void;
}) {
  return (
    <Picker
      selectedValue={selectedValue}
      onValueChange={onValueChange}
      itemStyle={pickerItemStyle}
      style={{
        height: 190,
        flex,
      }}
    >
      {values.map((value) => (
        <Picker.Item key={value} label={value} value={value} />
      ))}
    </Picker>
  );
});

export default function TimeWheelPicker({
  value,
  onChange,
}: TimeWheelPickerProps) {
  const [parts, setParts] = useState(() => parseTimeParts(value));
  const partsRef = useRef(parts);

  useEffect(() => {
    const currentValue = formatTimeParts(partsRef.current);

    if (value === currentValue) {
      return;
    }

    const nextParts = parseTimeParts(value);
    partsRef.current = nextParts;
    setParts(nextParts);
  }, [value]);

  const updatePart = useCallback(
    (nextPart: Partial<TimeParts>) => {
      const currentParts = partsRef.current;
      const nextParts = {
        ...currentParts,
        ...nextPart,
      };

      if (arePartsEqual(currentParts, nextParts)) {
        return;
      }

      partsRef.current = nextParts;
      setParts(nextParts);
      onChange(formatTimeParts(nextParts));
    },
    [onChange],
  );
  const handleHourChange = useCallback(
    (hour: string) => updatePart({ hour }),
    [updatePart],
  );
  const handleMinuteTensChange = useCallback(
    (minuteTens: string) => updatePart({ minuteTens }),
    [updatePart],
  );
  const handleMinuteOnesChange = useCallback(
    (minuteOnes: string) => updatePart({ minuteOnes }),
    [updatePart],
  );
  const handlePeriodChange = useCallback(
    (period: string) => updatePart({ period: period as TimePeriod }),
    [updatePart],
  );

  return (
    <View className="h-[190px] w-full flex-row items-center justify-center px-1">
      <Rail
        flex={1.25}
        selectedValue={parts.hour}
        values={HOURS}
        onValueChange={handleHourChange}
      />

      <View className="h-[190px] w-7 items-center justify-center pt-5">
        <Text className="text-2xl font-plus-jakarta-bold leading-7 text-black">
          :
        </Text>
      </View>

      <Rail
        flex={1}
        selectedValue={parts.minuteTens}
        values={MINUTE_TENS}
        onValueChange={handleMinuteTensChange}
      />
      <Rail
        flex={1}
        selectedValue={parts.minuteOnes}
        values={MINUTE_ONES}
        onValueChange={handleMinuteOnesChange}
      />
      <Rail
        flex={1.35}
        selectedValue={parts.period}
        values={PERIODS}
        onValueChange={handlePeriodChange}
      />
    </View>
  );
}
