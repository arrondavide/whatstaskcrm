"use client";

import { useEffect, useState, createContext, useContext, type ReactNode } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useAuthStore } from "@/stores/auth-store";
import { useTenantStore } from "@/stores/tenant-store";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  isNewUser: boolean;
  ready: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  isNewUser: false,
  ready: false,
});

export function useAuthContext() {
  return useContext(AuthContext);
}

const PUBLIC_PATHS = ["/login", "/signup", "/invite", "/forgot-password"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname === "/";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setUser, setLoading: setAuthLoading } = useAuthStore();
  const { setTenant, setFields, setLoading: setTenantLoading } = useTenantStore();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (!fbUser) {
        // Not signed in — clear state
        setUser(null);
        setTenant(null);
        setFields([]);
        setAuthLoading(false);
        setTenantLoading(false);
        setReady(true);

        // Redirect to login if on a protected route
        if (!isPublicPath(pathname)) {
          router.push("/login");
        }
        return;
      }

      // User is signed in — check if they exist in Firestore
      try {
        const token = await fbUser.getIdToken();
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setTenant(data.tenant);
          if (data.fields) setFields(data.fields);
          setIsNewUser(false);
          setReady(true);

          // If on auth page, redirect to dashboard
          if (pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname === "/") {
            router.push("/dashboard");
          }
        } else if (res.status === 404) {
          // New user — needs onboarding
          setIsNewUser(true);
          setAuthLoading(false);
          setTenantLoading(false);
          setReady(true);

          if (!pathname.startsWith("/onboarding")) {
            router.push("/onboarding");
          }
        } else {
          // Other error — log the full response
          const errData = await res.json().catch(() => ({}));
          console.error(`Auth API error [${res.status}]:`, errData.error, errData.details || "");

          setAuthLoading(false);
          setTenantLoading(false);
          setReady(true);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setAuthLoading(false);
        setTenantLoading(false);
        setReady(true);
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show loading screen while initializing
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-[13px] text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ firebaseUser, isNewUser, ready }}>
      {children}
    </AuthContext.Provider>
  );
}
