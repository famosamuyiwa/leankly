import { Colors } from "@/constants/common";
import { LocationFilterEnum, SexFilterEnum } from "@/constants/enums";
import { useState } from "react";
import { Text, View } from "react-native";
import RangeSlider from "react-native-fast-range-slider";
import { SelectItem } from "./SelectItem";

const AgeFilter = () => {
  const [range, setRange] = useState<{ min: number; max: number }>({
    min: 18,
    max: 25,
  });

  const onChange = ([min, max]: number[]) => {
    setRange({
      min,
      max,
    });
  };

  return (
    <View className="p-5 gap-5 ">
      <Text className="font-plus-jakarta-semibold ml-2">
        Range: {range.min} — {range.max}
        {range.max === 60 ? "+" : ""}
      </Text>
      <RangeSlider
        min={16}
        max={60}
        step={1}
        initialMinValue={range.min}
        initialMaxValue={range.max}
        width={300}
        thumbSize={24}
        trackHeight={4}
        selectedTrackStyle={{ backgroundColor: Colors.primary }}
        unselectedTrackStyle={{ backgroundColor: "#ccc" }}
        showThumbLines={false}
        thumbStyle={{ backgroundColor: Colors.primary }}
        onValuesChange={onChange}
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

const LocationFilter = () => {
  return (
    <>
      {Object.values(LocationFilterEnum).map((filter, index) => (
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

export { AgeFilter, LocationFilter, SexFilter };
