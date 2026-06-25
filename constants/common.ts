import { CalendarTheme } from "@marceloterreiro/flash-calendar";

export const Colors = {
  primary: "#00BFFF",
  primaryLight: "#00BFFF2A",
  primaryExtralight: "#00BFFF1A",
  secondary: "#FF7F50",
  secondaryLight: "#FF7F502A",
  secondaryExtralight: "#FF7F501A",
  accent: "#000000",
  accentLight: "#0000002A",
  accentExtraLight: "#0000001A",
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

export const BadgeStyle = {
  backgroundColor: Colors.secondary,
  minWidth: 14, // reduce badge width
  height: 14, // reduce badge height
  borderRadius: 7, // make it perfectly round
  paddingHorizontal: 0,
  paddingVertical: 0,
  fontSize: 8,
  lineHeight: 12,

  color: "white",
  fontFamily: "Plus-Jakarta-ExtraBold",
};

export const CalendarRangeTheme: CalendarTheme = {
  rowMonth: {
    content: {
      color: Colors.secondary,
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
  itemWeekName: { content: { color: Colors.accent } },
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
        color: !isPressed ? Colors.accent : "#ffffff",
      },
    }),
    today: ({ isPressed }) => ({
      container: {
        borderColor: Colors.primary,
        borderRadius: isPressed ? 4 : 30,
        backgroundColor: isPressed ? Colors.primary : "transparent",
      },
      content: {
        color: isPressed ? "#ffffff" : Colors.accent,
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
