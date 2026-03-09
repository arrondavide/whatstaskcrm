"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Building2,
  Palette,
  Users,
  Sparkles,
  Upload,
  X,
  Loader2,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/utils/cn";

interface SetupWizardProps {
  onComplete: (data: WizardData) => void;
  userName?: string;
}

interface WizardData {
  companyName: string;
  primaryColor: string;
  theme: "dark" | "light";
  recordLabel: string;
  recordLabelSingular: string;
  logoUrl?: string;
  inviteEmails: string[];
}

const steps = [
  { id: 1, label: "Company", icon: Building2 },
  { id: 2, label: "Branding", icon: Palette },
  { id: 3, label: "Team", icon: Users },
  { id: 4, label: "Ready", icon: Sparkles },
];

const presetColors = [
  "#7C3AED", "#2563EB", "#059669", "#DC2626",
  "#EA580C", "#D97706", "#DB2777", "#0891B2",
];

const industryPresets = [
  { label: "Manpower / Recruitment", record: "Candidates", singular: "Candidate" },
  { label: "Real Estate", record: "Properties", singular: "Property" },
  { label: "Sales / CRM", record: "Leads", singular: "Lead" },
  { label: "HR Management", record: "Employees", singular: "Employee" },
  { label: "Other", record: "Records", singular: "Record" },
];

export function SetupWizard({ onComplete, userName }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#7C3AED");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [recordLabel, setRecordLabel] = useState("");
  const [recordLabelSingular, setRecordLabelSingular] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleThemeChange(newTheme: "dark" | "light") {
    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  function selectPreset(preset: (typeof industryPresets)[0]) {
    setSelectedPreset(preset.label);
    setRecordLabel(preset.record);
    setRecordLabelSingular(preset.singular);
  }

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      return; // Max 2MB
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function addEmail() {
    const email = emailInput.trim().toLowerCase();
    setEmailError("");
    if (!email) return;
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email");
      return;
    }
    if (inviteEmails.includes(email)) {
      setEmailError("Already added");
      return;
    }
    setInviteEmails([...inviteEmails, email]);
    setEmailInput("");
  }

  function removeEmail(email: string) {
    setInviteEmails(inviteEmails.filter((e) => e !== email));
  }

  async function handleComplete() {
    setSubmitting(true);
    try {
      await onComplete({
        companyName,
        primaryColor,
        theme,
        recordLabel: recordLabel || "Records",
        recordLabelSingular: recordLabelSingular || "Record",
        logoUrl: logoPreview || undefined,
        inviteEmails,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        {/* Progress steps */}
        <div className="mb-8 flex items-center justify-center gap-1">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-medium transition-all duration-200",
                  step > s.id
                    ? "bg-primary text-primary-foreground"
                    : step === s.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground"
                )}
              >
                {step > s.id ? <Check className="h-3.5 w-3.5" /> : s.id}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-1.5 h-px w-10 transition-colors",
                    step > s.id ? "bg-primary" : "bg-border"
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
                  <h2 className="text-xl font-semibold tracking-tight">
                    Hey {userName}, let&apos;s set up your workspace
                  </h2>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Tell us about your company to get started
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Company / Organization Name</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label>What will you manage?</Label>
                  <p className="text-[12px] text-muted-foreground">
                    Pick your industry or choose &quot;Other&quot; to customize
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {industryPresets.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => selectPreset(preset)}
                        className={cn(
                          "rounded-lg border p-3 text-left text-[13px] transition-all duration-150",
                          selectedPreset === preset.label
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:bg-accent/50"
                        )}
                      >
                        <p className="font-medium">{preset.label}</p>
                        <p className="text-[11px] text-muted-foreground">{preset.record}</p>
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
                  <h2 className="text-xl font-semibold tracking-tight">
                    Make it yours
                  </h2>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Add your logo and pick a brand color
                  </p>
                </div>

                {/* Logo upload */}
                <div className="space-y-2">
                  <Label>Company Logo</Label>
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <div className="relative">
                        <img
                          src={logoPreview}
                          alt="Logo"
                          className="h-16 w-16 rounded-xl object-cover border border-border"
                        />
                        <button
                          onClick={removeLogo}
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                      >
                        <Upload className="h-5 w-5" />
                      </button>
                    )}
                    <div className="text-[12px] text-muted-foreground">
                      <p>Upload your logo</p>
                      <p>PNG, JPG up to 2MB</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoSelect}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Color picker */}
                <div className="space-y-3">
                  <Label>Brand Color</Label>
                  <div className="flex flex-wrap gap-3">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setPrimaryColor(color)}
                        className={cn(
                          "h-10 w-10 rounded-full transition-all duration-150",
                          primaryColor === color
                            ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110"
                            : "hover:scale-110"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Theme toggle */}
                <div className="space-y-3">
                  <Label>Theme</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleThemeChange("dark")}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 text-left text-[13px] transition-all duration-150",
                        theme === "dark"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:bg-accent/50"
                      )}
                    >
                      <Moon className="h-4 w-4" />
                      <div>
                        <p className="font-medium">Dark</p>
                        <p className="text-[11px] text-muted-foreground">Easy on the eyes</p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleThemeChange("light")}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 text-left text-[13px] transition-all duration-150",
                        theme === "light"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:bg-accent/50"
                      )}
                    >
                      <Sun className="h-4 w-4" />
                      <div>
                        <p className="font-medium">Light</p>
                        <p className="text-[11px] text-muted-foreground">Classic and clean</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Preview */}
                <div className="rounded-xl border border-border/60 p-5 text-center">
                  <div className="flex items-center justify-center gap-3">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {companyName[0]?.toUpperCase() || "C"}
                      </div>
                    )}
                    <div className="text-left">
                      <p className="font-semibold text-[14px]">{companyName}</p>
                      <p className="text-[11px] text-muted-foreground">Your workspace preview</p>
                    </div>
                  </div>
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
                  <h2 className="text-xl font-semibold tracking-tight">
                    Invite your team
                  </h2>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    They&apos;ll get an email invite to join {companyName}. You can always add more later.
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex gap-2">
                    <Input
                      value={emailInput}
                      onChange={(e) => {
                        setEmailInput(e.target.value);
                        setEmailError("");
                      }}
                      placeholder="colleague@company.com"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addEmail();
                        }
                      }}
                      error={emailError}
                    />
                    <Button variant="outline" onClick={addEmail} className="shrink-0">
                      Add
                    </Button>
                  </div>
                </div>
                {inviteEmails.length > 0 && (
                  <div className="space-y-1.5">
                    {inviteEmails.map((email) => (
                      <div
                        key={email}
                        className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-[13px]"
                      >
                        <span className="text-foreground">{email}</span>
                        <button
                          onClick={() => removeEmail(email)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <p className="text-[11px] text-muted-foreground">
                      {inviteEmails.length} invite{inviteEmails.length !== 1 ? "s" : ""} will be sent
                    </p>
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
                  className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Check className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    You&apos;re all set!
                  </h2>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    <strong>{companyName}</strong> is ready to go.
                    {inviteEmails.length > 0 && (
                      <> Invites will be sent to {inviteEmails.length} team member{inviteEmails.length !== 1 ? "s" : ""}.</>
                    )}
                  </p>
                </div>

                {/* Summary */}
                <div className="rounded-xl border border-border/60 p-4 text-left space-y-3">
                  <div className="flex items-center gap-3">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="h-8 w-8 rounded-lg object-cover" />
                    ) : (
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {companyName[0]?.toUpperCase() || "C"}
                      </div>
                    )}
                    <p className="font-medium text-[14px]">{companyName}</p>
                  </div>
                  <div className="h-px bg-border/60" />
                  <div className="grid grid-cols-3 gap-2 text-[12px]">
                    <div>
                      <p className="text-muted-foreground">Records</p>
                      <p className="font-medium">{recordLabel || "Records"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Theme</p>
                      <p className="font-medium capitalize">{theme}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Invites</p>
                      <p className="font-medium">{inviteEmails.length} member{inviteEmails.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button className="flex-1" onClick={handleComplete} disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Launch Workspace
                        <Sparkles className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
