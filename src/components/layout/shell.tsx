"use client";

import { type ReactNode } from "react";

interface ShellProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function Shell({ title, description, actions, children }: ShellProps) {
  return (
    <div className="flex flex-1 flex-col">
      {/* Page header */}
      {(title || actions) && (
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            {title && <h2 className="text-xl font-semibold tracking-tight">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Page content */}
      <div className="flex-1 px-6 pb-6">{children}</div>
    </div>
  );
}
