import { ChatCard, RequestCard } from "@/components/Cards";
import NavBar from "@/components/NavBar";
import { dummyRequests } from "@/constants/data";
import { NavbarOptions, Screens } from "@/constants/enums";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { View } from "react-native";

export default function MessagesScreen() {
  const handleOnDeclinePress = () => {};
  const handleOnAcceptPress = () => {};

  const params = useLocalSearchParams<{
    nav?: string;
  }>();

  const memoizedRequestCard = useMemo(() => {
    return (
      <RequestCard
        item={dummyRequests}
        onDeclinePress={handleOnDeclinePress}
        onAcceptPress={handleOnAcceptPress}
      />
    );
  }, []);

  const memoizedChatCard = useMemo(() => {
    return <ChatCard />;
  }, []);

  return (
    <View className="flex-1 bg-white px-5">
      <View className="py-5">
        <NavBar screen={Screens.CHAT} />
      </View>
      {params.nav === NavbarOptions.CHATS
        ? memoizedChatCard
        : memoizedRequestCard}
    </View>
  );
}
