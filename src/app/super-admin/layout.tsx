import type { ReactNode } from "react";

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-950">
      <aside className="w-56 border-r border-gray-800 bg-gray-900 p-4">
        <h2 className="text-lg font-bold text-white">Super Admin</h2>
        <nav className="mt-4 space-y-1">
          <a href="/super-admin/tenants" className="block rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white">Tenants</a>
          <a href="/super-admin/subscriptions" className="block rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white">Subscriptions</a>
          <a href="/super-admin/analytics" className="block rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white">Analytics</a>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
