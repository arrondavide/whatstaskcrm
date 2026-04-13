import { useQuery } from "@tanstack/react-query";

export type AppUser = {
  id: string;
  tenantId: string;
  authUid: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  permissions: Record<string, boolean>;
};

export type Tenant = {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  theme: string;
  recordLabel: string;
  recordLabelSingular: string;
  documentLabel: string;
  plan: string;
  pipelineConfig: { enabled: boolean; stages: { id: string; name: string; color: string; order: number }[] };
};

export function useAppUser() {
  return useQuery<{ user: AppUser; tenant: Tenant }>({
    queryKey: ["app-user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message ?? "Failed to load user");
      return data.data;
    },
    retry: false,
  });
}
