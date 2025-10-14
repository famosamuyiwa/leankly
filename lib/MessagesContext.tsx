import { Leank } from "@/interfaces";
import React, { ReactNode, createContext, useContext, useState } from "react";

interface MessagesContextType {
  currentLeank: Leank | undefined;
  setCurrentLeank: (leank: Leank) => void;
}

const MessagesContext = createContext<MessagesContextType | undefined>(
  undefined
);

export const MessagesProvider = ({ children }: { children: ReactNode }) => {
  const [currentLeank, setCurrentLeank] = useState<Leank | undefined>(
    undefined
  );

  return (
    <MessagesContext.Provider
      value={{
        currentLeank,
        setCurrentLeank,
      }}
    >
      {children}
    </MessagesContext.Provider>
  );
};

export const useMessagesContext = (): MessagesContextType => {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error(
      "useMessagesContext must be used within a MessagesProvider"
    );
  }
  return context;
};

export default MessagesProvider;
