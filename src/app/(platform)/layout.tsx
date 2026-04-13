"use client";

import { type ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/layout/shell";
import { useAppUser } from "@/hooks/queries/use-auth";
import { useAuth } from "@/components/providers/auth-provider";

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data, isLoading, error } = useAppUser();

  useEffect(() => {
    // If user is logged in but has no app profile → needs onboarding
    if (!authLoading && user && !isLoading && error) {
      router.push("/onboarding");
    }
  }, [authLoading, user, isLoading, error, router]);

  // Show loading while checking auth state
  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-violet-500" />
          <p className="mt-3 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user profile, don't render the shell (redirect happening)
  if (!data) {
    return null;
  }

  return <Shell>{children}</Shell>;
}
