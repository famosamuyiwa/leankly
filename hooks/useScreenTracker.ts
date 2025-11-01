import { currentScreenRef } from "@/lib/ScreenTracker";
import { usePathname } from "expo-router";
import { useEffect } from "react";

export const useScreenTracker = () => {
  const pathname = usePathname();

  useEffect(() => {
    currentScreenRef.current = pathname;
    return () => {
      currentScreenRef.current = null;
    };
  }, [pathname]);
};
