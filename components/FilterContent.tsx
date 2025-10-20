import { Colors } from "@/constants/common";
import { LocationFilterEnum, SexFilterEnum } from "@/constants/enums";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import RangeSlider from "react-native-fast-range-slider";
import { SelectItem } from "./SelectItem";

interface AgeFilterProps {
  range: {
    min: number;
    max: number;
  }; // parent-controlled selected value
  onChange: (values: { min: number; max: number }) => void; // callback to parent
}

const AgeFilter = ({ range, onChange }: AgeFilterProps) => {
  const [localRange, setLocalRange] = useState<{ min: number; max: number }>(
    range
  );

  // Keep local state synced if parent updates externally
  useEffect(() => {
    setLocalRange(range);
  }, [range]);

  const handleChange = ([min, max]: number[]) => {
    const updated = { min, max };
    setLocalRange(updated);
    onChange(updated);
  };

  return (
    <View className="p-5 gap-5">
      <Text className="font-plus-jakarta-semibold ml-2">
        Range: {localRange.min} — {localRange.max}
        {localRange.max === 60 ? "+" : ""}
      </Text>

      <RangeSlider
        min={16}
        max={60}
        step={1}
        initialMinValue={localRange.min}
        initialMaxValue={localRange.max}
        width={300}
        thumbSize={24}
        trackHeight={4}
        selectedTrackStyle={{ backgroundColor: Colors.primary }}
        unselectedTrackStyle={{ backgroundColor: "#ccc" }}
        showThumbLines={false}
        thumbStyle={{ backgroundColor: Colors.primary }}
        onValuesChange={handleChange}
      />
    </View>
  );
};

const SexFilter = () => {
  return (
    <>
      {Object.values(SexFilterEnum).map((filter, index) => (
        <SelectItem
          key={index}
          label={filter}
          isSelected={false}
          onPress={() => {}}
        />
      ))}
    </>
  );
};

interface LocationFilterProps {
  selected: string[]; // parent-controlled selected value
  onChange: (values: string[]) => void; // callback to parent
}

const LocationFilter = ({ selected, onChange }: LocationFilterProps) => {
  const [selectedValues, setSelectedValues] = useState<string[]>(selected);

  // 🔄 Keep local state synced with parent if it changes externally
  useEffect(() => {
    setSelectedValues(selected);
  }, [selected]);

  const handleToggle = (value: string) => {
    const exists = selectedValues.includes(value);
    const updated = exists
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];

    setSelectedValues(updated);
    onChange(updated);
  };

  return (
    <View className="gap-5">
      {Object.values(LocationFilterEnum).map((filter, index) => (
        <SelectItem
          key={index}
          label={filter}
          isSelected={selectedValues.includes(filter)}
          onPress={() => handleToggle(filter)}
        />
      ))}
    </View>
  );
};

export { AgeFilter, LocationFilter, SexFilter };
