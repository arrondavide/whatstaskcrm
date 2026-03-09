"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { cn } from "@/utils/cn";

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}

export function Dropdown({ trigger, children, align = "right", className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1.5 min-w-[180px] rounded-xl border border-border/60 bg-popover p-1.5 text-popover-foreground shadow-lg animate-fade-in",
            align === "right" ? "right-0" : "left-0",
            className
          )}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  className?: string;
}

export function DropdownItem({ children, onClick, destructive, className }: DropdownItemProps) {
  return (
    <button
      className={cn(
        "flex w-full items-center rounded-lg px-2.5 py-1.5 text-[13px] outline-none transition-colors hover:bg-accent/60 hover:text-accent-foreground",
        destructive && "text-destructive hover:text-destructive",
        className
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
