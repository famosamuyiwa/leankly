import React from "react";
import { MaterialIcons } from "@expo/vector-icons";

export const getStyles = (type: string) => {
  switch (type) {
    case "success":
      return {
        backgroundColor: "#def1d7",
        descriptionColor: "#1f8722",
        animationIcon: "verified" as "verified",
      };
    case "warning":
      return {
        backgroundColor: "#fef7ec",
        descriptionColor: "#f08135",
        animationIcon: "error" as "error",
      };
    case "error":
      return {
        backgroundColor: "#fae1db",
        descriptionColor: "#d9100a",
        animationIcon: "error" as "error",
      };
    default:
      return {
        backgroundColor: "white",
        descriptionColor: "gray",
        animationIcon: "verified" as "verified",
      };
  }
};
