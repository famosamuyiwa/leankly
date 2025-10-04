import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { TouchableOpacity } from "react-native";

const HeaderLeft = () => {
  return (
    <>
      <TouchableOpacity
        activeOpacity={0.6}
        className="bg-white rounded-full h-12 w-12 items-center justify-center"
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back" size={20} />
      </TouchableOpacity>
    </>
  );
};

export { HeaderLeft };
