import { Colors } from "@/constants/common";
import { SexFilterEnum } from "@/constants/enums";
import { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
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

const PROXIMITY_OPTIONS = [5, 10, 25, 50, 100];
const DEFAULT_RADIUS = 25;

const LocationFilter = ({
  value,
  onChange,
  userCoords,
}: LocationFilterProps) => {
  const nearby = value?.nearby;
  const isNearby = !!nearby;
  const isOnline = !!value?.includeOnline;
  const radius = nearby?.radiusKm || DEFAULT_RADIUS;

  const coords = useMemo(
    () =>
      userCoords && userCoords.lat != null && userCoords.lng != null
        ? { lat: userCoords.lat, lng: userCoords.lng }
        : nearby?.userLat != null && nearby?.userLng != null
          ? { lat: nearby.userLat, lng: nearby.userLng }
          : null,
    [userCoords, nearby]
  );

  const setValue = (next: LocationFilterValue | null) => {
    if (next?.includeOnline || next?.nearby) {
      onChange(next);
    } else {
      onChange(null);
    }
  };

  const applyNearby = (radiusKm: number) => {
    setValue({
      includeOnline: isOnline,
      nearby: {
        radiusKm,
        userLat: coords?.lat,
        userLng: coords?.lng,
      },
    });
  };

  const toggleNearby = () => {
    if (isNearby) {
      setValue({ includeOnline: isOnline, nearby: null });
    } else {
      applyNearby(radius);
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
      <SelectItem
        label={`Nearby${isNearby ? ` (${radius} km)` : ""}`}
        isSelected={isNearby}
        onPress={toggleNearby}
      />
      {isNearby && (
        <View className="gap-3">
          <View className="flex-row flex-wrap gap-2">
            {PROXIMITY_OPTIONS.map((km) => (
              <TouchableOpacity
                key={km}
                activeOpacity={0.7}
                onPress={() => applyNearby(km)}
                className={`px-4 py-2 rounded-full border ${
                  radius === km
                    ? "bg-primary-100 border-primary-300"
                    : "border-gray-200 bg-white"
                }`}
              >
                <Text
                  className={`font-plus-jakarta-semibold ${
                    radius === km ? "text-primary-300" : "text-gray-700"
                  }`}
                >
                  Within {km} km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text className="text-xs text-gray-500">
            Uses your saved neighborhood to calculate distance.
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

export { AgeFilter, LocationFilter, SexFilter };
