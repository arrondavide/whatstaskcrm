import { create } from "zustand";
import type { Filter, SortConfig } from "@/types";

type FilterStore = {
  search: string;
  filters: Filter[];
  sort: SortConfig | null;
  setSearch: (search: string) => void;
  setFilters: (filters: Filter[]) => void;
  addFilter: (filter: Filter) => void;
  removeFilter: (index: number) => void;
  setSort: (sort: SortConfig | null) => void;
  reset: () => void;
};

export const useFilterStore = create<FilterStore>((set) => ({
  search: "",
  filters: [],
  sort: null,
  setSearch: (search) => set({ search }),
  setFilters: (filters) => set({ filters }),
  addFilter: (filter) => set((s) => ({ filters: [...s.filters, filter] })),
  removeFilter: (index) => set((s) => ({ filters: s.filters.filter((_, i) => i !== index) })),
  setSort: (sort) => set({ sort }),
  reset: () => set({ search: "", filters: [], sort: null }),
}));
