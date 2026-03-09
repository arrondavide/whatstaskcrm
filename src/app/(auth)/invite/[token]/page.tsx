"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase/client";
import { useAuthStore } from "@/stores/auth-store";
import { useTenantStore } from "@/stores/tenant-store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

interface InviteInfo {
  id: string;
  tenant_name: string;
  role: string;
  invited_by_name: string;
}

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const { setUser } = useAuthStore();
  const { setTenant } = useTenantStore();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate the invite on load
  useEffect(() => {
    async function validateInvite() {
      try {
        const res = await fetch(`/api/invites?id=${token}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Invalid invite link");
          return;
        }
        const data = await res.json();
        setInvite(data);
      } catch {
        setError("Failed to validate invite");
      } finally {
        setLoading(false);
      }
    }
    validateInvite();
  }, [token]);

  async function handleGoogleSignIn() {
    setSigning(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      // Accept the invite
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: idToken, inviteId: token }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to join workspace");
        return;
      }

      const data = await res.json();
      setUser(data.user);
      setTenant(data.tenant);

      toast.success(`Welcome to ${invite?.tenant_name}!`);
      router.push("/dashboard");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to sign in";
      if (message.includes("popup-closed-by-user")) return;
      toast.error("Failed to sign in. Please try again.");
    } finally {
      setSigning(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="mt-3 text-[13px] text-muted-foreground">Validating invite...</p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold">{error}</h3>
          <p className="mt-1 text-[13px] text-muted-foreground">
            This invite may have expired or already been used.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => router.push("/login")}>
            Go to Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Valid invite
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground">
          W
        </div>
        <CardTitle className="text-xl">You&apos;ve been invited</CardTitle>
        <CardDescription>
          <strong>{invite?.invited_by_name}</strong> invited you to join{" "}
          <strong>{invite?.tenant_name}</strong> as {invite?.role === "admin" ? "an" : "a"}{" "}
          <strong>{invite?.role}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          className="w-full h-11 text-[14px]"
          onClick={handleGoogleSignIn}
          disabled={signing}
        >
          {signing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Joining...
            </>
          ) : (
            <>
              <GoogleIcon className="h-5 w-5 mr-2" />
              Continue with Google
            </>
          )}
        </Button>
        <p className="mt-4 text-center text-[12px] text-muted-foreground/60">
          Sign in with the Google account linked to your invite email.
        </p>
      </CardContent>
    </Card>
  );
}
