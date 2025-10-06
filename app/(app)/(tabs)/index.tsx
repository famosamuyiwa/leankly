import { LeankCardBig } from "@/components/Cards";
import Filters from "@/components/Filters";
import { dummyBooking } from "@/constants/data";
import { Screens } from "@/constants/enums";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  if (!insets) {
    return null; // Prevents glitching by waiting for insets
  }
  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <View className="pl-5">
        <Filters screen={Screens.HOME} />
      </View>
      <View className="flex-1 px-5 pt-5">
        <LeankCardBig item={dummyBooking[0]} />
        <View className="flex-row gap-16 items-center justify-center flex-1">
          <TouchableOpacity
            activeOpacity={0.6}
            className="bg-white shadow-md rounded-full size-20  shadow-gray-300 items-center justify-center"
          >
            <Feather name="x" size={35} color="black" />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.6}
            className="bg-white shadow-md rounded-full size-20  shadow-gray-300 items-center justify-center"
          >
            <MaterialCommunityIcons name="heart" size={35} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
