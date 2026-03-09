"use client";

import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/providers/auth-provider";
import { useAuthStore } from "@/stores/auth-store";
import { useTenantStore } from "@/stores/tenant-store";
import { SetupWizard } from "@/components/onboarding/setup-wizard";
import toast from "react-hot-toast";

export default function OnboardingPage() {
  const router = useRouter();
  const { firebaseUser } = useAuthContext();
  const { setUser } = useAuthStore();
  const { setTenant } = useTenantStore();

  if (!firebaseUser) {
    router.push("/login");
    return null;
  }

  async function handleComplete(data: {
    companyName: string;
    primaryColor: string;
    theme: "dark" | "light";
    recordLabel: string;
    recordLabelSingular: string;
    inviteEmails: string[];
  }) {
    try {
      const token = await firebaseUser!.getIdToken();
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          companyName: data.companyName,
          primaryColor: data.primaryColor,
          theme: data.theme,
          recordLabel: data.recordLabel,
          recordLabelSingular: data.recordLabelSingular,
          inviteEmails: data.inviteEmails,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create workspace");
      }

      const result = await res.json();
      setUser(result.user);
      setTenant(result.tenant);

      toast.success("Workspace created! Welcome aboard.");
      router.push("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    }
  }

  return <SetupWizard onComplete={handleComplete} userName={firebaseUser.displayName || "there"} />;
}
