"use client";

import { useAppUser } from "@/hooks/queries/use-auth";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    features: ["3 team members", "10 custom fields", "500MB storage", "Basic support"],
    value: "free",
  },
  {
    name: "Starter",
    price: "$19",
    features: ["10 team members", "50 custom fields", "5GB storage", "Email support", "WhatsApp integration"],
    value: "starter",
  },
  {
    name: "Professional",
    price: "$49",
    features: ["Unlimited team members", "Unlimited fields", "50GB storage", "Priority support", "WhatsApp integration", "Custom branding"],
    value: "professional",
  },
  {
    name: "Enterprise",
    price: "Custom",
    features: ["Everything in Professional", "Dedicated support", "SLA guarantee", "Custom integrations", "On-premise option"],
    value: "enterprise",
  },
];

export default function BillingSettingsPage() {
  const { data: appData } = useAppUser();
  const currentPlan = appData?.tenant?.plan ?? "free";

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Billing</h1>
      <p className="mt-1 text-sm text-gray-400">Manage your subscription</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.value === currentPlan;
          return (
            <div
              key={plan.value}
              className={`rounded-xl border p-6 ${
                isCurrent ? "border-violet-500 bg-violet-600/10" : "border-gray-800 bg-gray-900"
              }`}
            >
              <h3 className="text-lg font-bold text-white">{plan.name}</h3>
              <p className="mt-1 text-2xl font-bold text-white">
                {plan.price}
                {plan.price !== "Custom" && <span className="text-sm font-normal text-gray-400">/mo</span>}
              </p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <Check size={14} className="text-green-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={isCurrent}
                className={`mt-6 w-full rounded-lg px-4 py-2 text-sm font-medium ${
                  isCurrent
                    ? "bg-violet-600/20 text-violet-400 cursor-default"
                    : "bg-gray-800 text-white hover:bg-gray-700"
                }`}
              >
                {isCurrent ? "Current Plan" : "Upgrade"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
