"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ArrowRight, ArrowLeft, Building2, Palette, Users, Sparkles } from "lucide-react";
import { cn } from "@/utils/cn";

interface SetupWizardProps {
  onComplete: (data: WizardData) => void;
}

interface WizardData {
  companyName: string;
  primaryColor: string;
  recordLabel: string;
  recordLabelSingular: string;
  inviteEmails: string[];
}

const steps = [
  { id: 1, label: "Company", icon: Building2 },
  { id: 2, label: "Branding", icon: Palette },
  { id: 3, label: "Team", icon: Users },
  { id: 4, label: "Done", icon: Sparkles },
];

const presetColors = [
  "#7C3AED", "#2563EB", "#059669", "#DC2626",
  "#EA580C", "#D97706", "#DB2777", "#0891B2",
];

const industryPresets = [
  { label: "Manpower / Recruitment", record: "Candidates", singular: "Candidate" },
  { label: "Real Estate", record: "Properties", singular: "Property" },
  { label: "Sales", record: "Leads", singular: "Lead" },
  { label: "HR", record: "Employees", singular: "Employee" },
  { label: "Other", record: "Records", singular: "Record" },
];

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#7C3AED");
  const [recordLabel, setRecordLabel] = useState("Records");
  const [recordLabelSingular, setRecordLabelSingular] = useState("Record");
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");

  function addEmail() {
    if (!emailInput.trim() || inviteEmails.includes(emailInput)) return;
    setInviteEmails([...inviteEmails, emailInput.trim()]);
    setEmailInput("");
  }

  function removeEmail(email: string) {
    setInviteEmails(inviteEmails.filter((e) => e !== email));
  }

  function selectPreset(preset: typeof industryPresets[0]) {
    setRecordLabel(preset.record);
    setRecordLabelSingular(preset.singular);
  }

  function handleComplete() {
    onComplete({
      companyName,
      primaryColor,
      recordLabel,
      recordLabelSingular,
      inviteEmails,
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        {/* Progress steps */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                  step > s.id
                    ? "bg-primary text-primary-foreground"
                    : step === s.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step > s.id ? <Check className="h-4 w-4" /> : s.id}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 w-8 transition-colors",
                    step > s.id ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardContent className="p-6">
            {/* Step 1: Company */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold">Set up your company</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    What&apos;s the name of your organization?
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Harrisons Manpower"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label>What kind of records will you manage?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {industryPresets.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => selectPreset(preset)}
                        className={cn(
                          "rounded-md border p-3 text-left text-sm transition-colors",
                          recordLabel === preset.record
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-accent"
                        )}
                      >
                        <p className="font-medium">{preset.label}</p>
                        <p className="text-xs text-muted-foreground">{preset.record}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => setStep(2)}
                  disabled={!companyName.trim()}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 2: Branding */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold">Choose your brand color</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This will be used throughout your workspace
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  {presetColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setPrimaryColor(color)}
                      className={cn(
                        "h-12 w-12 rounded-full border-2 transition-transform hover:scale-110",
                        primaryColor === color
                          ? "border-foreground scale-110"
                          : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                {/* Preview */}
                <div className="rounded-lg border border-border p-4 text-center">
                  <div
                    className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {companyName[0] || "C"}
                  </div>
                  <p className="font-medium">{companyName}</p>
                  <p className="text-xs text-muted-foreground">Your workspace preview</p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button onClick={() => setStep(3)} className="flex-1">
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Invite team */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold">Invite your team</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add team members by email. You can skip this for now.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="employee@company.com"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())}
                  />
                  <Button variant="outline" onClick={addEmail}>
                    Add
                  </Button>
                </div>
                {inviteEmails.length > 0 && (
                  <div className="space-y-2">
                    {inviteEmails.map((email) => (
                      <div
                        key={email}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                      >
                        <span>{email}</span>
                        <button
                          onClick={() => removeEmail(email)}
                          className="text-muted-foreground hover:text-destructive text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button onClick={() => setStep(4)} className="flex-1">
                    {inviteEmails.length > 0 ? "Continue" : "Skip for now"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Done */}
            {step === 4 && (
              <div className="space-y-6 text-center">
                <div
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Check className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">You&apos;re all set!</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {companyName} workspace is ready. Start by adding your fields
                    and first records.
                  </p>
                </div>
                <Button className="w-full" onClick={handleComplete}>
                  Go to Dashboard
                  <Sparkles className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
