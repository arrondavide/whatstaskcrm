export type SubscriptionStatus = "free" | "trial" | "active" | "suspended";

export type ThemeMode = "dark" | "light";

export interface TenantBranding {
  name: string;
  logo_url?: string;
  primary_color: string;
  theme: ThemeMode;
}

export interface TenantSubscription {
  plan_id?: string;
  status: SubscriptionStatus;
  trial_end_date?: string;
  billing_email?: string;
}

export interface Tenant {
  id: string;
  branding: TenantBranding;
  subscription: TenantSubscription;
  record_label: string; // "Candidates", "Leads", "Properties", etc.
  record_label_singular: string; // "Candidate", "Lead", "Property", etc.
  document_label: string; // "Certificates", "Contracts", etc.
  created_at: string;
  created_by: string;
}

export interface TenantWithStats extends Tenant {
  user_count: number;
  record_count: number;
}
