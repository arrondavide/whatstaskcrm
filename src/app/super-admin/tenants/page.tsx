"use client";

import { useQuery } from "@tanstack/react-query";

type TenantInfo = {
  id: string;
  name: string;
  plan: string;
  subscriptionStatus: string;
  createdAt: string;
  usage: { record_count: number; user_count: number };
};

export default function SuperAdminTenantsPage() {
  const { data: tenants, isLoading } = useQuery<TenantInfo[]>({
    queryKey: ["super-admin-tenants"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/tenants");
      const data = await res.json();
      return data.data ?? [];
    },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">All Tenants</h1>

      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800 bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Plan</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Users</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Records</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : !tenants?.length ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No tenants</td></tr>
            ) : (
              tenants.map((t) => (
                <tr key={t.id} className="hover:bg-gray-900/50">
                  <td className="px-4 py-3 font-medium text-white">{t.name}</td>
                  <td className="px-4 py-3 capitalize text-gray-300">{t.plan}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${t.subscriptionStatus === "active" ? "bg-green-900/30 text-green-400" : "bg-gray-800 text-gray-400"}`}>
                      {t.subscriptionStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{t.usage?.user_count ?? 0}</td>
                  <td className="px-4 py-3 text-gray-300">{t.usage?.record_count ?? 0}</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
