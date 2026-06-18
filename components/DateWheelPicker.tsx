import { Picker } from "@react-native-picker/picker";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

interface DateParts {
  year: number;
  month: number;
  day: number;
}

interface DateWheelPickerProps {
  value: Date;
  onChange: (date: Date) => void;
}

const pickerItemStyle = {
  fontFamily: "Plus-Jakarta-SemiBold",
  fontSize: 20,
  color: "black",
};

const getToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();

const getDateKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

const arePartsEqual = (a: DateParts, b: DateParts) =>
  a.year === b.year && a.month === b.month && a.day === b.day;

const dateToParts = (date: Date, today: Date): DateParts => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return {
      year: today.getFullYear(),
      month: today.getMonth(),
      day: today.getDate(),
    };
  }

  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
  };
};

const partsToDate = ({ year, month, day }: DateParts) =>
  new Date(year, month, day);

const getMinMonth = (year: number, today: Date) =>
  year === today.getFullYear() ? today.getMonth() : 0;

const getMinDay = (year: number, month: number, today: Date) =>
  year === today.getFullYear() && month === today.getMonth()
    ? today.getDate()
    : 1;

const clampDateParts = (parts: DateParts, today: Date): DateParts => {
  const minYear = today.getFullYear();
  const maxYear = minYear + 5;
  const year = Math.min(maxYear, Math.max(minYear, parts.year));
  const minMonth = getMinMonth(year, today);
  const month = Math.min(11, Math.max(minMonth, parts.month));
  const minDay = getMinDay(year, month, today);
  const maxDay = getDaysInMonth(year, month);
  const day = Math.min(maxDay, Math.max(minDay, parts.day));

  return { year, month, day };
};

const getMonthOptions = (year: number, today: Date) => {
  const minMonth = getMinMonth(year, today);
  return MONTHS.map((label, value) => ({ label, value })).slice(minMonth);
};

const getDayOptions = (year: number, month: number, today: Date) => {
  const minDay = getMinDay(year, month, today);
  const maxDay = getDaysInMonth(year, month);

  return Array.from({ length: maxDay - minDay + 1 }, (_, index) => {
    const value = minDay + index;
    return { label: String(value), value };
  });
};

const Rail = memo(function Rail({
  flex,
  selectedValue,
  values,
  onValueChange,
}: {
  flex: number;
  selectedValue: number;
  values: { label: string; value: number }[];
  onValueChange: (value: number) => void;
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
      {values.map((option) => (
        <Picker.Item
          key={option.value}
          label={option.label}
          value={option.value}
        />
      ))}
    </Picker>
  );
});

export default function DateWheelPicker({
  value,
  onChange,
}: DateWheelPickerProps) {
  const today = useMemo(() => getToday(), []);
  const years = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => {
        const value = today.getFullYear() + index;
        return { label: String(value), value };
      }),
    [today],
  );
  const [parts, setParts] = useState(() =>
    clampDateParts(dateToParts(value, today), today),
  );
  const partsRef = useRef(parts);

  const monthOptions = useMemo(
    () => getMonthOptions(parts.year, today),
    [parts.year, today],
  );
  const dayOptions = useMemo(
    () => getDayOptions(parts.year, parts.month, today),
    [parts.year, parts.month, today],
  );

  useEffect(() => {
    const currentDate = partsToDate(partsRef.current);

    if (getDateKey(value) === getDateKey(currentDate)) {
      return;
    }

    const nextParts = clampDateParts(dateToParts(value, today), today);
    partsRef.current = nextParts;
    setParts(nextParts);
  }, [today, value]);

  const updatePart = useCallback(
    (nextPart: Partial<DateParts>) => {
      const currentParts = partsRef.current;
      const nextParts = clampDateParts(
        {
          ...currentParts,
          ...nextPart,
        },
        today,
      );

      if (arePartsEqual(currentParts, nextParts)) {
        return;
      }

      partsRef.current = nextParts;
      setParts(nextParts);
      onChange(partsToDate(nextParts));
    },
    [onChange, today],
  );
  const handleMonthChange = useCallback(
    (month: number) => updatePart({ month }),
    [updatePart],
  );
  const handleDayChange = useCallback(
    (day: number) => updatePart({ day }),
    [updatePart],
  );
  const handleYearChange = useCallback(
    (year: number) => updatePart({ year }),
    [updatePart],
  );

  return (
    <View className="h-[190px] w-full flex-row items-center justify-center px-1">
      <Rail
        flex={1.75}
        selectedValue={parts.month}
        values={monthOptions}
        onValueChange={handleMonthChange}
      />
      <Rail
        flex={0.9}
        selectedValue={parts.day}
        values={dayOptions}
        onValueChange={handleDayChange}
      />
      <Rail
        flex={1.1}
        selectedValue={parts.year}
        values={years}
        onValueChange={handleYearChange}
      />
    </View>
  );
}
