import { create } from "zustand";
import type { CrmRecord } from "@/types/record";
import type { FilterGroup, SortConfig, SavedView } from "@/types/filter";

interface RecordState {
  records: CrmRecord[];
  loading: boolean;
  selectedIds: string[];
  activeFilters: FilterGroup;
  activeSort: SortConfig[];
  activeView: SavedView | null;
  savedViews: SavedView[];
  searchQuery: string;

  setRecords: (records: CrmRecord[]) => void;
  addRecord: (record: CrmRecord) => void;
  updateRecord: (id: string, data: Partial<CrmRecord>) => void;
  removeRecord: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setSelectedIds: (ids: string[]) => void;
  toggleSelected: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setActiveFilters: (filters: FilterGroup) => void;
  setActiveSort: (sort: SortConfig[]) => void;
  setActiveView: (view: SavedView | null) => void;
  setSavedViews: (views: SavedView[]) => void;
  setSearchQuery: (query: string) => void;
}

export const useRecordStore = create<RecordState>((set) => ({
  records: [],
  loading: true,
  selectedIds: [],
  activeFilters: { match: "all", filters: [] },
  activeSort: [],
  activeView: null,
  savedViews: [],
  searchQuery: "",

  setRecords: (records) => set({ records, loading: false }),
  addRecord: (record) =>
    set((state) => ({ records: [record, ...state.records] })),
  updateRecord: (id, data) =>
    set((state) => ({
      records: state.records.map((r) => (r.id === id ? { ...r, ...data } : r)),
    })),
  removeRecord: (id) =>
    set((state) => ({
      records: state.records.filter((r) => r.id !== id),
      selectedIds: state.selectedIds.filter((sid) => sid !== id),
    })),
  setLoading: (loading) => set({ loading }),
  setSelectedIds: (ids) => set({ selectedIds: ids }),
  toggleSelected: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((sid) => sid !== id)
        : [...state.selectedIds, id],
    })),
  selectAll: () =>
    set((state) => ({ selectedIds: state.records.map((r) => r.id) })),
  clearSelection: () => set({ selectedIds: [] }),
  setActiveFilters: (filters) => set({ activeFilters: filters }),
  setActiveSort: (sort) => set({ activeSort: sort }),
  setActiveView: (view) =>
    set({
      activeView: view,
      activeFilters: view?.filters ?? { match: "all", filters: [] },
      activeSort: view?.sort ?? [],
    }),
  setSavedViews: (views) => set({ savedViews: views }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
