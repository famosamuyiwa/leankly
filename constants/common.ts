import { CalendarTheme } from "@marceloterreiro/flash-calendar";

export const Colors = {
  primary: "#00BFFF",
  primaryLight: "#00BFFF2A",
  primaryExtralight: "#00BFFF1A",
  accent: "#FF7F50",
  secondary: "#1F2430",
  secondaryLight: "#1F24302A",
  secondaryExtralight: "#1F24301A",
};

export const ImagePickerMediaTypes = {
  Images: "images" as any,
  Videos: "videos" as any,
  Multimedia: ["images", "videos"] as any,
};

export const HeaderStyles = {
  headerTitleStyle: {
    fontFamily: "Plus-Jakarta-ExtraBold",
  },
};

export const CalendarRangeTheme: CalendarTheme = {
  rowMonth: {
    content: {
      color: Colors.accent,
      fontWeight: "700",
    },
  },
  rowWeek: {
    container: {
      borderBottomWidth: 0.4,
      borderBottomColor: "lightgrey",
      borderStyle: "solid",
    },
  },
  itemWeekName: { content: { color: Colors.secondary } },
  itemDayContainer: {
    activeDayFiller: {
      backgroundColor: Colors.primary,
    },
  },
  itemDay: {
    idle: ({ isPressed, isWeekend }) => ({
      container: {
        backgroundColor: isPressed ? Colors.primary : "transparent",
        borderRadius: 4,
      },
      content: {
        color: !isPressed ? Colors.secondary : "#ffffff",
      },
    }),
    today: ({ isPressed }) => ({
      container: {
        borderColor: Colors.primary,
        borderRadius: isPressed ? 4 : 30,
        backgroundColor: isPressed ? Colors.primary : "transparent",
      },
      content: {
        color: isPressed ? "#ffffff" : Colors.secondary,
      },
    }),
    active: ({ isEndOfRange, isStartOfRange, isDisabled }) => ({
      container: {
        backgroundColor: isDisabled ? "lightgrey" : Colors.primary,
        borderTopLeftRadius: isStartOfRange ? 4 : 0,
        borderBottomLeftRadius: isStartOfRange ? 4 : 0,
        borderTopRightRadius: isEndOfRange ? 4 : 0,
        borderBottomRightRadius: isEndOfRange ? 4 : 0,
      },
      content: {
        color: isDisabled ? "darkgrey" : "white",
      },
    }),
    disabled: ({ isEndOfRange, isStartOfRange }) => ({
      content: {
        color: "lightgrey",
      },
    }),
  },
};
