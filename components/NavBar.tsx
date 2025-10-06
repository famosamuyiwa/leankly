import { navbarOptions } from "@/constants/data";
import { NavbarOptions, Screens } from "@/constants/enums";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

const NavBar = ({ screen }: { screen: Screens }) => {
  const params = useLocalSearchParams<{ nav?: string }>();
  const [selectedNav, setSelectedNav] = useState(
    params.nav ??
      (screen === Screens.CHAT ? NavbarOptions.REQUESTS : NavbarOptions.HOSTED)
  );

  const handleCategoryPress = (nav: string) => {
    if (selectedNav === nav) {
      return;
    }
    setSelectedNav(nav);
    router.setParams({ nav });
  };

  useEffect(() => {
    router.setParams({ nav: selectedNav });
  }, []);

  return (
    <View className="flex-row bg-primary-100 p-2 rounded-full justify-between">
      {navbarOptions
        .filter((nav) => nav.screen === screen)
        .map((item, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleCategoryPress(item.title)}
            className={`flex-col items-center w-1/2 py-1 rounded-full ${
              selectedNav === item.title ? "bg-primary-300" : ""
            }`}
          >
            <Text
              className={`text-sm ${
                selectedNav === item.title
                  ? "text-white font-plus-jakarta-extrabold mt-0.5"
                  : "text-gray-400 font-plus-jakarta-regular"
              }`}
            >
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
    </View>
  );
};

export default NavBar;
