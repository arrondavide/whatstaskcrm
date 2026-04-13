"use client";

import { useQuery } from "@tanstack/react-query";

export default function SuperAdminSubscriptionsPage() {
  const { data: tenants } = useQuery({
    queryKey: ["super-admin-tenants"],
    queryFn: async () => {
      const res = await fetch("/api/super-admin/tenants");
      const data = await res.json();
      return data.data ?? [];
    },
  });

  const plans = ["free", "starter", "professional", "enterprise"];
  const planCounts = plans.map((p) => ({
    plan: p,
    count: tenants?.filter((t: { plan: string }) => t.plan === p).length ?? 0,
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Subscriptions</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {planCounts.map((p) => (
          <div key={p.plan} className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <p className="text-sm capitalize text-gray-400">{p.plan}</p>
            <p className="mt-2 text-3xl font-bold text-white">{p.count}</p>
            <p className="text-xs text-gray-500">tenants</p>
          </div>
        ))}
      </div>
    </div>
  );
}
