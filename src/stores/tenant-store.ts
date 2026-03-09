import { create } from "zustand";
import type { Tenant, Field } from "@/types";

interface TenantState {
  tenant: Tenant | null;
  fields: Field[];
  loading: boolean;
  setTenant: (tenant: Tenant | null) => void;
  setFields: (fields: Field[]) => void;
  setLoading: (loading: boolean) => void;
  addField: (field: Field) => void;
  updateField: (id: string, updates: Partial<Field>) => void;
  removeField: (id: string) => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  tenant: null,
  fields: [],
  loading: true,
  setTenant: (tenant) => set({ tenant, loading: false }),
  setFields: (fields) => set({ fields: fields.sort((a, b) => a.order - b.order) }),
  setLoading: (loading) => set({ loading }),
  addField: (field) =>
    set((state) => ({
      fields: [...state.fields, field].sort((a, b) => a.order - b.order),
    })),
  updateField: (id, updates) =>
    set((state) => ({
      fields: state.fields
        .map((f) => (f.id === id ? { ...f, ...updates } : f))
        .sort((a, b) => a.order - b.order),
    })),
  removeField: (id) =>
    set((state) => ({
      fields: state.fields.filter((f) => f.id !== id),
    })),
}));
