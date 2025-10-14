import React, { ReactNode, createContext, useContext } from "react";

interface FiltersContextType {}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

export const FiltersProvider = ({ children }: { children: ReactNode }) => {
  return (
    <FiltersContext.Provider value={{}}>{children}</FiltersContext.Provider>
  );
};

export const useFiltersContext = (): FiltersContextType => {
  const context = useContext(FiltersContext);
  if (!context) {
    throw new Error("useFiltersContext must be used within a FiltersProvider");
  }
  return context;
};

export default FiltersProvider;
