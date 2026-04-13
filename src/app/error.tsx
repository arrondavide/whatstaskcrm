"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-900/20">
          <AlertTriangle size={32} className="text-red-400" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-white">Something went wrong</h1>
        <p className="mt-2 max-w-md text-sm text-gray-400">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
