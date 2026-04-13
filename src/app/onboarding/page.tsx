"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import toast from "react-hot-toast";

const steps = ["Company", "Labels", "Confirm"];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    userName: "",
    recordLabel: "Records",
    recordLabelSingular: "Record",
  });

  // Prefill name from Google profile once auth loads
  useEffect(() => {
    if (user && !form.userName) {
      setForm((f) => ({ ...f, userName: user.user_metadata?.full_name ?? user.email ?? "" }));
    }
  }, [user]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error?.message ?? "Onboarding failed");
        return;
      }
      toast.success("Workspace created!");
      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-white">Set up your workspace</h1>
        <p className="mt-1 text-sm text-gray-400">Step {step + 1} of {steps.length}</p>

        {/* Progress bar */}
        <div className="mt-4 flex gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-violet-500" : "bg-gray-700"
              }`}
            />
          ))}
        </div>

        <div className="mt-8">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Company Name</label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder="Acme Corp"
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Your Name</label>
                <input
                  type="text"
                  value={form.userName}
                  onChange={(e) => setForm({ ...form, userName: e.target.value })}
                  placeholder="John Doe"
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                What do you call your main data? (e.g., Leads, Clients, Candidates, Properties)
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-300">Plural Label</label>
                <input
                  type="text"
                  value={form.recordLabel}
                  onChange={(e) => setForm({ ...form, recordLabel: e.target.value })}
                  placeholder="Records"
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Singular Label</label>
                <input
                  type="text"
                  value={form.recordLabelSingular}
                  onChange={(e) => setForm({ ...form, recordLabelSingular: e.target.value })}
                  placeholder="Record"
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3 rounded-lg border border-gray-700 bg-gray-800 p-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Company</span>
                <span className="font-medium text-white">{form.companyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Your Name</span>
                <span className="font-medium text-white">{form.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Record Label</span>
                <span className="font-medium text-white">{form.recordLabel}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800"
            >
              Back
            </button>
          )}
          <button
            onClick={() => {
              if (step < steps.length - 1) {
                setStep(step + 1);
              } else {
                handleSubmit();
              }
            }}
            disabled={
              loading ||
              (step === 0 && (!form.companyName || !form.userName)) ||
              (step === 1 && !form.recordLabel)
            }
            className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : step === steps.length - 1 ? "Create Workspace" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
