import { filterDescriptions } from "@/constants/data";
import { FilterOptions, LeankCategory } from "@/constants/enums";
import { useFiltersContext } from "@/lib/FiltersContext";
import { useGlobalContext } from "@/lib/GlobalContext";
import { useProfileContext } from "@/lib/ProfileContext";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import Constants from "expo-constants";
import * as Location from "expo-location";
import React, {
  useCallback,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import CustomButton from "./Button";
import {
  AgeFilter,
  CategoryFilter,
  createDefaultLocationFilter,
  LocationFilter,
  LocationFilterValue,
} from "./FilterContent";
import SearchBar from "./SearchBar";

type MapboxFeature = {
  id?: string;
  geometry?: {
    coordinates?: number[];
  };
  properties?: {
    mapbox_id?: string;
    name?: string;
    full_address?: string;
    place_formatted?: string;
    feature_type?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
    context?: {
      neighborhood?: { name?: string };
      place?: { name?: string };
      locality?: { name?: string };
      district?: { name?: string };
      region?: { name?: string };
    };
  };
};

type MapboxGeocodingResponse = {
  features?: MapboxFeature[];
  message?: string;
};

const FilterBottomSheet = forwardRef(function FilterBottomSheet(_props, ref) {
  // ref
  const bottomSheetRef = useRef<BottomSheet>(null);
  // expose bottom sheet methods to parent
  useImperativeHandle(ref, () => ({
    expand: () => bottomSheetRef.current?.expand(),
    close: () => bottomSheetRef.current?.close(),
    snapTo: (index: number) => bottomSheetRef.current?.snapToIndex(index),
  }));

  const { setPendingFilter, confirmPendingFilter, pendingFilter, filters } =
    useFiltersContext();
  const { currentUser } = useGlobalContext();
  const locationValue =
    pendingFilter?.key === FilterOptions.LOCATION
      ? (pendingFilter.value as LocationFilterValue | null)
      : (filters?.[FilterOptions.LOCATION] as LocationFilterValue) ||
        createDefaultLocationFilter({
          lat: currentUser?.locationLat,
          lng: currentUser?.locationLng,
        });
  const categoryValue =
    pendingFilter?.key === FilterOptions.CATEGORY
      ? (pendingFilter.value as LeankCategory[]) || []
      : (filters?.[FilterOptions.CATEGORY] as LeankCategory[]) || [];
  const ageValue =
    pendingFilter?.key === FilterOptions.AGE
      ? (pendingFilter.value as { min: number; max: number }) || {
          min: 16,
          max: 28,
        }
      : (filters?.[FilterOptions.AGE] as { min: number; max: number }) || {
          min: 16,
          max: 28,
        };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.3}
        />
      )}
      enablePanDownToClose
      handleStyle={{
        borderTopLeftRadius: 100,
        borderTopRightRadius: 100,
      }}
      handleIndicatorStyle={{ backgroundColor: "lightgrey" }}
    >
      <BottomSheetView className="px-5 pb-10 gap-5">
        <Text className="font-plus-jakarta-bold text-center text-xl pt-2">
          {pendingFilter?.key}
        </Text>
        <Text className="font-plus-jakarta-semibold text-gray-400 text-center ">
          {filterDescriptions[pendingFilter?.key || FilterOptions.TODAY]}
        </Text>
        <View className="py-5 gap-5">
          {pendingFilter?.key === FilterOptions.AGE && (
            <AgeFilter
              range={ageValue}
              onChange={(range) => setPendingFilter(FilterOptions.AGE, range)}
            />
          )}
          {pendingFilter?.key === FilterOptions.LOCATION && (
            <LocationFilter
              value={locationValue}
              userCoords={{
                lat: currentUser?.locationLat,
                lng: currentUser?.locationLng,
              }}
              onChange={(value) =>
                setPendingFilter(FilterOptions.LOCATION, value ?? null)
              }
            />
          )}
          {pendingFilter?.key === FilterOptions.CATEGORY && (
            <CategoryFilter
              selected={categoryValue}
              onToggle={(category) => {
                const next = categoryValue.includes(category)
                  ? categoryValue.filter((c) => c !== category)
                  : [...categoryValue, category];
                setPendingFilter(
                  FilterOptions.CATEGORY,
                  next.length ? next : null,
                );
              }}
            />
          )}
        </View>

        <CustomButton
          label="Done"
          onPress={() => {
            bottomSheetRef.current?.close();
            confirmPendingFilter();
          }}
        />
      </BottomSheetView>
    </BottomSheet>
  );
});

const ProfileBottomSheet = forwardRef(function ProfileBottomSheet(_props, ref) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const MAPBOX_ACCESS_TOKEN = Constants.expoConfig?.extra?.mapboxAccessToken!;
  const { setLocation, setLocationCoords } = useProfileContext();

  // local state
  const [query, setQuery] = useState("");
  const [placesResults, setPlacesResults] = useState<MapboxFeature[]>([]);

  // expose bottom sheet methods to parent
  useImperativeHandle(ref, () => ({
    expand: () => bottomSheetRef.current?.expand(),
    close: () => bottomSheetRef.current?.close(),
    snapTo: (index: number) => bottomSheetRef.current?.snapToIndex(index),
  }));

  const getFeatureLabel = (feature: MapboxFeature) => {
    const { name, full_address, place_formatted } = feature.properties || {};
    return (
      full_address ||
      [name, place_formatted].filter(Boolean).join(", ") ||
      name ||
      place_formatted ||
      "Unknown location"
    );
  };

  const getFeatureNeighborhood = (feature: MapboxFeature) => {
    const properties = feature.properties;
    const context = properties?.context;

    return (
      context?.neighborhood?.name ||
      context?.locality?.name ||
      (properties?.feature_type === "neighborhood"
        ? properties.name
        : undefined) ||
      context?.place?.name ||
      (properties?.feature_type === "place" ? properties.name : undefined) ||
      properties?.name ||
      "Unknown neighborhood"
    );
  };

  const getFeatureCoords = (feature: MapboxFeature) => {
    const longitude =
      feature.properties?.coordinates?.longitude ??
      feature.geometry?.coordinates?.[0];
    const latitude =
      feature.properties?.coordinates?.latitude ??
      feature.geometry?.coordinates?.[1];

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return null;
    }

    return { lat: latitude, lng: longitude };
  };

  // 🔍 call Mapbox Geocoding API
  const fetchPlaces = useCallback(async () => {
    if (query.length < 3) {
      setPlacesResults([]);
      return;
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(
          query,
        )}&access_token=${encodeURIComponent(
          MAPBOX_ACCESS_TOKEN,
        )}&autocomplete=true&limit=5`,
      );

      const data: MapboxGeocodingResponse = await response.json();

      if (response.ok) {
        setPlacesResults(data.features || []);
      } else {
        console.warn("Mapbox Geocoding API error:", data.message);
        setPlacesResults([]);
      }
    } catch (err) {
      console.error("Error fetching places:", err);
    }
  }, [MAPBOX_ACCESS_TOKEN, query]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  const onLocationPress = async (
    location: "current" | "search",
    feature?: MapboxFeature,
  ) => {
    try {
      if (location === "current") {
        // Ask for location permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          alert("Location permission denied. Please enable it in settings.");
          return;
        }

        //  Get current GPS coordinates
        const loc = await Location.getCurrentPositionAsync({});
        const latitude = loc.coords.latitude;
        const longitude = loc.coords.longitude;
        const data = await getNeighborhood(latitude, longitude);
        const firstResult = data.features?.[0];

        if (!firstResult) {
          console.warn("Mapbox Geocoding API error:", data.message);
          return;
        }

        setLocation(getFeatureNeighborhood(firstResult));
        setLocationCoords({ lat: latitude, lng: longitude });
        bottomSheetRef.current?.close();
      } else {
        if (!feature) return;

        const coords = getFeatureCoords(feature);
        setPlacesResults([]); // clear list after selection
        setLocation(getFeatureNeighborhood(feature));
        if (coords) setLocationCoords(coords);
        bottomSheetRef.current?.close();
      }
    } catch (err) {
      console.error("Error getting current location:", err);
    }
  };

  const getNeighborhood = async (latitude: number, longitude: number) => {
    // Call Mapbox reverse geocoding API to get neighborhood name
    const response = await fetch(
      `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${encodeURIComponent(
        longitude,
      )}&latitude=${encodeURIComponent(
        latitude,
      )}&access_token=${encodeURIComponent(
        MAPBOX_ACCESS_TOKEN,
      )}&types=neighborhood,locality,place`,
    );

    return (await response.json()) as MapboxGeocodingResponse;
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.3}
        />
      )}
      snapPoints={["80%"]}
      enablePanDownToClose
      handleStyle={{
        borderTopLeftRadius: 100,
        borderTopRightRadius: 100,
      }}
    >
      <BottomSheetView className="px-4 pb-5 h-full">
        {/*  Search input */}
        <SearchBar
          placeholder="Search for a location"
          className="bg-white"
          value={query}
          onChangeText={setQuery}
        />

        {/* current location */}
        <TouchableOpacity
          onPress={() => onLocationPress("current")}
          className="flex-row items-center gap-3 p-5"
        >
          <Ionicons name="paper-plane" size={16} />
          <Text className="text-gray-800 line-clamp-1 font-plus-jakarta-regular">
            Use my current location
          </Text>
        </TouchableOpacity>

        {/*  List of results */}
        {placesResults.length > 0 && (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(500)}
            className="flex-grow bg-white rounded-lg"
          >
            {placesResults.map((place, index) => (
              <TouchableOpacity
                key={place.properties?.mapbox_id || place.id || index}
                onPress={() => onLocationPress("search", place)}
                className="p-4 border-b border-gray-200 flex-row items-center gap-5"
              >
                <Ionicons name="location" size={16} />
                <Text className="text-gray-800 line-clamp-1 font-plus-jakarta-regular">
                  {getFeatureLabel(place)}
                </Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
});

export { FilterBottomSheet, ProfileBottomSheet };
