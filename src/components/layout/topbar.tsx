"use client";

import { Bell, Search, Sun, Moon, LogOut } from "lucide-react";
import { cn } from "@/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { useNotificationStore } from "@/stores/notification-store";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { Avatar } from "@/components/ui/avatar";
import { useState, useEffect } from "react";

interface TopbarProps {
  title?: string;
}

export function Topbar({ title }: TopbarProps) {
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);
  }, []);

  function toggleTheme() {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", newMode ? "dark" : "light");
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border/50 bg-background px-6">
      {/* Left: Title */}
      <div className="flex items-center gap-4">
        {title && <h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-all duration-150">
          <Search className="h-4 w-4" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-all duration-150"
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Notifications */}
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-all duration-150">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* User menu */}
        <Dropdown
          trigger={
            <button className="flex items-center gap-2 rounded-lg p-1 hover:bg-accent/60 transition-all duration-150">
              <Avatar name={user?.name || "User"} size="sm" />
            </button>
          }
        >
          <div className="px-2.5 py-1.5 text-[13px]">
            <p className="font-medium">{user?.name}</p>
            <p className="text-[11px] text-muted-foreground">{user?.email}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <DropdownItem onClick={logout} destructive>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}
