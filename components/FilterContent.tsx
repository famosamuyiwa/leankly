import { Colors } from "@/constants/common";
import { leankCategories } from "@/constants/data";
import { LeankCategory, SexFilterEnum } from "@/constants/enums";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import RangeSlider from "react-native-fast-range-slider";
import { SelectItem } from "./SelectItem";
import { SingleSlider } from "./SingleSlider";

interface AgeFilterProps {
  range: {
    min: number;
    max: number;
  }; // parent-controlled selected value
  onChange: (values: { min: number; max: number }) => void; // callback to parent
}

const AgeFilter = ({ range, onChange }: AgeFilterProps) => {
  const [localRange, setLocalRange] = useState<{ min: number; max: number }>(
    range,
  );

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

const CategoryFilter = ({
  selected,
  onToggle,
}: {
  selected: LeankCategory[];
  onToggle: (category: LeankCategory) => void;
}) => {
  return (
    <View className="gap-3">
      {leankCategories.map((category) => (
        <SelectItem
          key={category}
          label={category}
          isSelected={selected.includes(category)}
          onPress={() => onToggle(category)}
        />
      ))}
    </View>
  );
};

interface LocationFilterProps {
  value: LocationFilterValue | null;
  onChange: (value: LocationFilterValue | null) => void;
  userCoords?: { lat?: number | null; lng?: number | null };
}

export interface LocationFilterValue {
  nearby?: {
    radiusKm: number;
    userLat?: number;
    userLng?: number;
  } | null;
  includeOnline?: boolean;
}

const KM_PER_MILE = 1.609344;
const MIN_RADIUS_MILES = 1;
const MAX_RADIUS_MILES = 100;
const DEFAULT_RADIUS_MILES = 25;

const clampRadiusMiles = (miles: number) =>
  Math.min(MAX_RADIUS_MILES, Math.max(MIN_RADIUS_MILES, Math.round(miles)));

const kmToMiles = (km: number) => clampRadiusMiles(km / KM_PER_MILE);

const milesToKm = (miles: number) =>
  Number((clampRadiusMiles(miles) * KM_PER_MILE).toFixed(3));

const RadiusSlider = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (miles: number) => void;
}) => {
  const clampedValue = clampRadiusMiles(value);

  return (
    <View className="gap-3">
      <View className="flex-row justify-between">
        <Text className="font-plus-jakarta-semibold text-gray-900">
          Within {clampedValue} mi
        </Text>
      </View>

      <SingleSlider
        min={MIN_RADIUS_MILES}
        max={MAX_RADIUS_MILES}
        step={1}
        value={clampedValue}
        thumbSize={24}
        trackHeight={4}
        selectedTrackStyle={{ backgroundColor: Colors.primary }}
        unselectedTrackStyle={{ backgroundColor: "#ccc" }}
        thumbStyle={{ backgroundColor: "#fff" }}
        onValueChange={onChange}
      />
    </View>
  );
};

const LocationFilter = ({
  value,
  onChange,
  userCoords,
}: LocationFilterProps) => {
  const nearby = value?.nearby;
  const isNearby = !!nearby;
  const isOnline = !!value?.includeOnline;
  const radiusMiles =
    nearby?.radiusKm != null
      ? kmToMiles(nearby.radiusKm)
      : DEFAULT_RADIUS_MILES;

  const coords = useMemo(
    () =>
      userCoords && userCoords.lat != null && userCoords.lng != null
        ? { lat: userCoords.lat, lng: userCoords.lng }
        : nearby?.userLat != null && nearby?.userLng != null
          ? { lat: nearby.userLat, lng: nearby.userLng }
          : null,
    [userCoords, nearby],
  );

  const setValue = (next: LocationFilterValue | null) => {
    if (next?.includeOnline || next?.nearby) {
      onChange(next);
    } else {
      onChange(null);
    }
  };

  const applyNearby = (radiusMiles: number) => {
    setValue({
      includeOnline: isOnline,
      nearby: {
        radiusKm: milesToKm(radiusMiles),
        userLat: coords?.lat,
        userLng: coords?.lng,
      },
    });
  };

  const toggleNearby = () => {
    if (isNearby) {
      setValue({ includeOnline: isOnline, nearby: null });
    } else {
      applyNearby(radiusMiles);
    }
  };

  const toggleOnline = () => {
    setValue({
      includeOnline: !isOnline,
      nearby: nearby ?? null,
    });
  };

  return (
    <View className="gap-4">
      <SelectItem label="Nearby" isSelected={isNearby} onPress={toggleNearby} />
      {isNearby && (
        <View className="gap-3">
          <RadiusSlider value={radiusMiles} onChange={applyNearby} />
          <Text className="text-xs text-gray-500">
            Uses your saved neighborhood to calculate distance in miles.
          </Text>
          {!coords && (
            <Text className="text-xs text-red-500">
              Add a neighborhood in your profile to enable proximity filtering.
            </Text>
          )}
        </View>
      )}

      <SelectItem label="Online" isSelected={isOnline} onPress={toggleOnline} />
    </View>
  );
};

export { AgeFilter, CategoryFilter, LocationFilter, SexFilter };
