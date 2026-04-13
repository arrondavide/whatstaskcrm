"use client";

import { Search, Bell, LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useUIStore } from "@/stores/ui-store";
import { useAppUser } from "@/hooks/queries/use-auth";

export function Topbar() {
  const { signOut } = useAuth();
  const { data } = useAppUser();
  const { toggleSidebar } = useUIStore();
  const [search, setSearch] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-800 bg-gray-900 px-4">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="rounded-md p-1 text-gray-400 hover:text-white md:hidden"
        >
          <Menu size={20} />
        </button>

        {/* Search */}
        <div className="relative hidden sm:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-64 rounded-lg border border-gray-700 bg-gray-800 py-1.5 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button className="relative rounded-md p-2 text-gray-400 hover:bg-gray-800 hover:text-white">
          <Bell size={18} />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-800"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-xs font-medium text-white">
              {data?.user?.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-gray-700 bg-gray-800 py-1 shadow-xl">
                <div className="border-b border-gray-700 px-3 py-2">
                  <p className="text-sm font-medium text-white">{data?.user?.name}</p>
                  <p className="text-xs text-gray-400">{data?.user?.email}</p>
                </div>
                <button
                  onClick={signOut}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
