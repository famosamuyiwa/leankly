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
  LocationFilter,
  LocationFilterValue,
} from "./FilterContent";
import SearchBar from "./SearchBar";

const FilterBottomSheet = forwardRef(({}, ref) => {
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
      : ((filters?.[FilterOptions.LOCATION] as LocationFilterValue) || null);
  const categoryValue =
    pendingFilter?.key === FilterOptions.CATEGORY
      ? ((pendingFilter.value as LeankCategory[]) || [])
      : ((filters?.[FilterOptions.CATEGORY] as LeankCategory[]) || []);

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
              range={
                (filters?.[FilterOptions.AGE] as any) || { min: 16, max: 28 }
              }
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
                  next.length ? next : null
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

const ProfileBottomSheet = forwardRef(({}, ref) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const GOOGLE_MAPS_PLACES_API_KEY =
    Constants.expoConfig?.extra?.googleMapsPlacesApiKey!;
  const { setLocation, setLocationCoords } = useProfileContext();

  // local state
  const [query, setQuery] = useState("");
  const [placesResults, setPlacesResults] = useState<any[]>([]);

  useEffect(() => {
    fetchPlaces();
  }, [query]);

  // expose bottom sheet methods to parent
  useImperativeHandle(ref, () => ({
    expand: () => bottomSheetRef.current?.expand(),
    close: () => bottomSheetRef.current?.close(),
    snapTo: (index: number) => bottomSheetRef.current?.snapToIndex(index),
  }));

  // 🔍 call Google Places API
  const fetchPlaces = async () => {
    if (!query) return;
    try {
      if (query.length < 3) {
        setPlacesResults([]);
        return;
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query
        )}&key=${encodeURIComponent(GOOGLE_MAPS_PLACES_API_KEY)}`
      );

      const data = await response.json();

      if (data.status === "OK") {
        setPlacesResults(data.predictions);
      } else {
        console.warn("Google Places API error:", data.status);
        setPlacesResults([]);
      }
    } catch (err) {
      console.error("Error fetching places:", err);
    }
  };

  const onLocationPress = async (
    location: "current" | "search",
    place_id?: any
  ) => {
    try {
      // Ask for location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("Location permission denied. Please enable it in settings.");
        return;
      }

      let loc: any;
      let latitude: number | undefined;
      let longitude: number | undefined;

      if (location === "current") {
        //  Get current GPS coordinates
        loc = await Location.getCurrentPositionAsync({});
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
      } else {
        if (!place_id) return;
        setPlacesResults([]); // clear list after selection
      }

      const data = await getCity(latitude, longitude, place_id);

      if (data.status === "OK") {
        //  Extract the city (locality) from the response
        const firstResult = data.results[0];
        const addressComponents = firstResult?.address_components || [];
        const cityComponent = addressComponents.find((c: any) =>
          c.types.includes("locality")
        );
        const city = cityComponent?.long_name ?? "Unknown city";

        setLocation(city);
        const geometryLoc = firstResult?.geometry?.location;
        const finalLat = latitude ?? geometryLoc?.lat;
        const finalLng = longitude ?? geometryLoc?.lng;
        if (typeof finalLat === "number" && typeof finalLng === "number") {
          setLocationCoords({ lat: finalLat, lng: finalLng });
        }
        bottomSheetRef.current?.close();
      } else {
        console.warn("Geocoding API error:", data.status);
      }
    } catch (err) {
      console.error("Error getting current location:", err);
    }
  };

  const getCity = async (
    latitude?: number,
    longitude?: number,
    place_id?: number
  ) => {
    const searchType = place_id
      ? `place_id=${encodeURIComponent(place_id)}`
      : `latlng=${latitude},${longitude}`;
    // Call Google Geocoding API to get city name
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${searchType}&key=${encodeURIComponent(
        GOOGLE_MAPS_PLACES_API_KEY
      )}`
    );

    return await response.json();
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
            {placesResults.map((place) => (
              <TouchableOpacity
                key={place.place_id}
                onPress={() => onLocationPress("search", place.place_id)}
                className="p-4 border-b border-gray-200 flex-row items-center gap-5"
              >
                <Ionicons name="location" size={16} />
                <Text className="text-gray-800 line-clamp-1 font-plus-jakarta-regular">
                  {place.description}
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
