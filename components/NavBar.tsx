import { navbarOptions } from "@/constants/data";
import { NavbarOptions, Screens } from "@/constants/enums";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

const NavBar = ({
  screen,
  badgeCounts,
}: {
  screen: Screens;
  badgeCounts?: Partial<Record<NavbarOptions, number>>;
}) => {
  const params = useLocalSearchParams<{ nav?: string }>();
  const [selectedNav, setSelectedNav] = useState(
    params.nav ??
      (screen === Screens.CHAT ? NavbarOptions.REQUESTS : NavbarOptions.HOSTED),
  );

  const handleCategoryPress = (nav: string) => {
    if (selectedNav === nav) {
      return;
    }
    setSelectedNav(nav);
  };

  useEffect(() => {
    router.setParams({ nav: selectedNav });
  }, [selectedNav]);

  return (
    <View className="flex-row bg-primary-100 p-2 rounded-full justify-between">
      {navbarOptions
        .filter((nav) => nav.screen === screen)
        .map((item, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleCategoryPress(item.title)}
            className={`flex-row justify-center items-center w-1/2 py-1 rounded-full gap-2 ${
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
            {(badgeCounts?.[item.title] || 0) > 0 && (
              <View
                className={`${selectedNav === item.title ? "bg-white" : "bg-gray-100"} items-center justify-center size-4 rounded-full `}
              >
                <Text
                  className={`font-plus-jakarta-bold text-center text-xs ${selectedNav === item.title ? "text-primary-300" : "text-gray-400"} `}
                >
                  {badgeCounts?.[item.title]}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
    </View>
  );
};

export default NavBar;
