// contexts/FiltersContext.tsx
import { FilterOptions } from "@/constants/enums";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

export interface Filters {
  [key: string]:
    | string
    | number
    | boolean
    | null
    | undefined
    | Record<string, any>;
}

interface FiltersContextType {
  filters: Filters;
  pendingFilter: { key?: FilterOptions; value?: any } | null;
  setFilter: (key: FilterOptions, value: any) => void; // applies immediately
  setPendingFilter: (key: FilterOptions, value: any) => void; // sets temp filter
  confirmPendingFilter: () => void; // commit bottom-sheet filter
  clearFilter: (key: FilterOptions) => void;
  clearAll: () => void;
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

export const FiltersProvider = ({ children }: { children: ReactNode }) => {
  const [filters, setFilters] = useState<Filters>({});
  const [pendingFilter, setPendingFilterState] = useState<{
    key?: FilterOptions;
    value?: any;
  } | null>(null);

  const setFilter = useCallback((key: FilterOptions, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setPendingFilter = useCallback((key: FilterOptions, value: any) => {
    setPendingFilterState({ key, value });
  }, []);

  const confirmPendingFilter = useCallback(() => {
    if (pendingFilter?.key)
      setFilters((prev) => ({
        ...prev,
        [pendingFilter.key!]: pendingFilter.value,
      }));
    setPendingFilterState(null);
  }, [pendingFilter]);

  const clearFilter = useCallback((key: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setFilters({}), []);

  return (
    <FiltersContext.Provider
      value={{
        filters,
        pendingFilter,
        setFilter,
        setPendingFilter,
        confirmPendingFilter,
        clearFilter,
        clearAll,
      }}
    >
      {children}
    </FiltersContext.Provider>
  );
};

export const useFiltersContext = () => {
  const ctx = useContext(FiltersContext);
  if (!ctx)
    throw new Error("useFiltersContext must be used within FiltersProvider");
  return ctx;
};
