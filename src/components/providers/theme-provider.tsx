"use client";

import { createContext, useContext, useCallback, useSyncExternalStore, type ReactNode } from "react";

type Theme = "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  setTheme: () => {},
  accentColor: "#7C3AED",
  setAccentColor: () => {},
});

// External store for theme to avoid setState-in-useEffect issues
let currentTheme: Theme = "dark";
let currentAccent = "#7C3AED";
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((l) => l());
}

function subscribeTheme(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getThemeSnapshot() { return currentTheme; }
function getThemeServerSnapshot() { return "dark" as Theme; }
function getAccentSnapshot() { return currentAccent; }
function getAccentServerSnapshot() { return "#7C3AED"; }

// Initialize from localStorage on first client load
if (typeof window !== "undefined") {
  currentTheme = (localStorage.getItem("crm-theme") as Theme) ?? "dark";
  currentAccent = localStorage.getItem("crm-accent") ?? "#7C3AED";

  // Apply immediately
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(currentTheme);
  applyAccent(currentAccent);
}

function applyAccent(color: string) {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--accent", color);
  root.style.setProperty("--accent-text", color);
  root.style.setProperty("--accent-light", `${color}1a`);
  root.style.setProperty("--accent-lighter", `${color}0d`);

  // Darken for hover
  const hex = color.replace("#", "");
  const r = Math.max(0, parseInt(hex.slice(0, 2), 16) - 20);
  const g = Math.max(0, parseInt(hex.slice(2, 4), 16) - 20);
  const b = Math.max(0, parseInt(hex.slice(4, 6), 16) - 20);
  root.style.setProperty("--accent-hover", `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);
  const accentColor = useSyncExternalStore(subscribeTheme, getAccentSnapshot, getAccentServerSnapshot);

  const setTheme = useCallback((t: Theme) => {
    currentTheme = t;
    localStorage.setItem("crm-theme", t);
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(t);
    notifyListeners();
  }, []);

  const setAccentColor = useCallback((color: string) => {
    currentAccent = color;
    localStorage.setItem("crm-accent", color);
    applyAccent(color);
    notifyListeners();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, accentColor, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
