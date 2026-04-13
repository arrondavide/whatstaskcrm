import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export type FieldItem = {
  id: string;
  tenantId: string;
  label: string;
  type: string;
  fieldOrder: number;
  required: boolean;
  sensitive: boolean;
  filterable: boolean;
  searchable: boolean;
  showInTable: boolean;
  config: Record<string, unknown>;
};

export function useFields() {
  return useQuery<FieldItem[]>({
    queryKey: ["fields"],
    queryFn: async () => {
      const res = await fetch("/api/fields");
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data;
    },
  });
}

export function useCreateField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { label: string; type: string; required?: boolean; config?: Record<string, unknown> }) => {
      const res = await fetch("/api/fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fields"] });
      toast.success("Field created");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
