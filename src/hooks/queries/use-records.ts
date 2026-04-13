import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

type RecordItem = {
  id: string;
  tenantId: string;
  data: Record<string, unknown>;
  pipelineStage: string | null;
  assignedTo: string | null;
  tags: string[];
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string | null;
};

type PaginatedRecords = {
  items: RecordItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function useRecords(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  stage?: string;
  assignedTo?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  if (params?.search) query.set("search", params.search);
  if (params?.stage) query.set("stage", params.stage);
  if (params?.assignedTo) query.set("assignedTo", params.assignedTo);

  return useQuery<PaginatedRecords>({
    queryKey: ["records", params],
    queryFn: async () => {
      const res = await fetch(`/api/records?${query}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data;
    },
  });
}

export function useRecord(id: string) {
  return useQuery<RecordItem>({
    queryKey: ["record", id],
    queryFn: async () => {
      const res = await fetch(`/api/records/${id}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { data: Record<string, unknown>; pipelineStage?: string; assignedTo?: string; tags?: string[] }) => {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["records"] });
      toast.success("Record created");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; data?: Record<string, unknown>; pipelineStage?: string; assignedTo?: string | null; tags?: string[] }) => {
      const res = await fetch(`/api/records/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["records"] });
      qc.invalidateQueries({ queryKey: ["record", vars.id] });
      toast.success("Record updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/records/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["records"] });
      toast.success("Record deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
