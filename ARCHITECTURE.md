# CRM WhatsTask — System Architecture & Design

> **Version**: 3.1 — Postgres + Neon, production-hardened architecture
> **Last Updated**: 2026-03-10
> **Production URL**: `https://crm.whatstask.com`
> **Status**: Pre-development — this document is the implementation blueprint

---

## Table of Contents

1. [Project Overview & Tech Stack](#1-project-overview--tech-stack)
2. [Architecture Principles](#2-architecture-principles)
3. [Infrastructure & Deployment](#3-infrastructure--deployment)
4. [Folder Structure](#4-folder-structure)
5. [Database Schema](#5-database-schema)
6. [TypeScript Types & Contracts](#6-typescript-types--contracts)
7. [Security Architecture](#7-security-architecture)
8. [Authentication & Session Management](#8-authentication--session-management)
9. [API Layer — Middleware & Routes](#9-api-layer--middleware--routes)
10. [State Management Architecture](#10-state-management-architecture)
11. [Role-Based Access Control (RBAC)](#11-role-based-access-control-rbac)
12. [Custom Field System](#12-custom-field-system)
13. [Server-Side Query Engine](#13-server-side-query-engine)
14. [Real-Time Data Sync](#14-real-time-data-sync)
15. [Onboarding Flow](#15-onboarding-flow)
16. [Invite & Team Management](#16-invite--team-management)
17. [File Storage & Upload](#17-file-storage--upload)
18. [Audit Logging System](#18-audit-logging-system)
19. [Pipeline / Kanban Board](#19-pipeline--kanban-board)
20. [Chat & Messaging](#20-chat--messaging)
21. [Notification System](#21-notification-system)
22. [Document Templates & PDF Generation](#22-document-templates--pdf-generation)
23. [WhatsApp Integration](#23-whatsapp-integration)
24. [Billing & Subscriptions](#24-billing--subscriptions)
25. [Validation Layer](#25-validation-layer)
26. [Error Handling Strategy](#26-error-handling-strategy)
27. [UI & Design System](#27-ui--design-system)
28. [Environment Variables](#28-environment-variables)
29. [Navigation Map](#29-navigation-map)
30. [Feature Status & Roadmap](#30-feature-status--roadmap)
31. [Implementation Phases](#31-implementation-phases)

---

## 1. Project Overview & Tech Stack

**CRM WhatsTask** is a multi-tenant, white-label CRM SaaS platform built for service businesses (manpower agencies, real estate, sales teams, HR departments). Each tenant gets a fully branded workspace with customizable records, team management, audit logging, pipeline management, integrated messaging, and document templating.

**Scale target**: 100k+ records per tenant, 10+ tenants.

### Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR, routing, API routes |
| UI Library | React 19 | Component rendering |
| Language | TypeScript 5.7 (strict mode) | Type safety across stack |
| **Database** | **PostgreSQL 16** | Relational data, full-text search, JSONB for dynamic fields |
| **ORM** | **Drizzle ORM** | Type-safe SQL, migrations, zero overhead |
| Auth | Firebase Authentication (Google OAuth) | Identity provider |
| File Storage | Cloudflare R2 (free tier) | S3-compatible file storage |
| Server State | TanStack React Query 5 | Cache, sync, background refetch |
| Client State | Zustand 5.0 | UI-only state (filters, modals, selections) |
| Real-time | Server-Sent Events (SSE) | Live updates for records, chat, notifications |
| Validation | Zod 3.24 | Runtime schema validation (client + server) |
| Styling | Tailwind CSS 4, Shadcn-style components | Design system |
| Typography | Urbanist (Google Fonts) | Brand font |
| Tables | TanStack React Table 8.21 | Data grid with sort/filter/select |
| Icons | Lucide React | Consistent iconography |
| Dates | date-fns 4.1 | Date formatting and comparison |
| Notifications | react-hot-toast | Toast feedback |
| File Upload | react-dropzone | Drag-and-drop uploads |
| Payments | Stripe (Checkout + Webhooks) | Billing and subscriptions |
| WhatsApp | WhatsApp Business Cloud API | Messaging integration |
| PDF | @react-pdf/renderer | Document generation |
| App Hosting | Vercel (free tier) | Edge network, serverless |
| DB Hosting | **Neon (free tier)** → Hetzner VPS when profitable | Serverless Postgres |

---

## 2. Architecture Principles

### 2.1 Security First
- **Every API route authenticates via Firebase ID token** — no header-based trust
- **Every mutation checks RBAC permissions** — server-side, not just UI
- **Every input is validated with Zod** — at the API boundary before any DB operation
- **Tenant isolation via `tenant_id` on every table** + Row-Level Security as backup

### 2.2 Single Source of Truth
- **Server data** lives in React Query cache — records, fields, tenant, users
- **Client UI state** lives in Zustand — filters, selections, modals, sidebar
- **PostgreSQL is the single source of truth** — no dual-write, no cache-as-DB

### 2.3 Fail Loudly, Recover Gracefully
- **Every error has a user-visible message** — no silent failures, no infinite spinners
- **Error boundaries isolate crashes** — a broken field doesn't take down the page
- **Retry logic with exponential backoff** — for transient network failures

### 2.4 Least Privilege
- **Users see only what their role allows** — UI hides unauthorized actions
- **API enforces permissions regardless of UI** — defense in depth
- **Row-Level Security is the last line of defense** — even if API is bypassed

### 2.5 Server-Side Everything at Scale
- **ALL filtering, sorting, searching, pagination happen in PostgreSQL** — never in the browser
- **Client receives only the current page** (50 records) — never the full dataset
- **Full-text search is built into Postgres** — no external service needed

---

## 3. Infrastructure & Deployment

### 3.1 Architecture Diagram

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   User Browser   │     │   Vercel (Free)   │     │  Neon (Free)     │
│                  │     │                   │     │  Serverless      │
│  Next.js App     │────▶│  API Routes       │────▶│  PostgreSQL 16   │
│  React 19        │◀────│  (Serverless)     │◀────│                  │
│  React Query     │     │                   │     │  512MB storage   │
│  Zustand         │     │  SSE endpoint     │     │  Auto-sleep      │
│                  │     │  for real-time     │     │  100 connections │
└──────────────────┘     └──────────────────┘     └──────────────────┘
         │                       │
         │    ┌─────────────┐    │    ┌──────────────────┐
         └───▶│  Firebase    │    └───▶│  Cloudflare R2   │
              │  Auth (free) │         │  (free 10GB)     │
              │  Google OAuth│         │  S3-compatible   │
              └─────────────┘         │  $0 egress       │
                                       └──────────────────┘
```

### 3.2 Database Hosting — Start Free, Scale When Profitable

```
PHASE 1 — LAUNCH ($0/mo):
  Neon Free Tier — Serverless PostgreSQL 16
  512MB storage, 100 pooled connections
  Keep-alive cron prevents sleep (Vercel cron pings every 4 min)
  Handles: 1 tenant, up to 100k records (5k records = ~5MB, uses 1% of quota)
  No credit card required

PHASE 2 — FIRST REVENUE ($19/mo):
  Neon Pro — 10GB storage, always-on, autoscaling compute
  Handles: 10+ tenants, up to 1M+ records
  Migrate when: first paying customer covers the cost

PHASE 3 — SCALING ($15-30/mo):
  Hetzner VPS — self-managed PostgreSQL
  Migrate via: pg_dump from Neon → pg_restore on VPS (30 min, zero code changes)
  Handles: unlimited tenants, unlimited records
  Migrate when: Neon cost exceeds VPS cost (~$40+/mo on Neon)
```

### 3.3 Database Connection from Vercel

```typescript
// src/db/index.ts
// Neon has built-in connection pooling — optimized for serverless

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

// When migrating to VPS later, just change this file:
// import { drizzle } from "drizzle-orm/node-postgres";
// import { Pool } from "pg";
// const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// export const db = drizzle(pool, { schema });
```

### 3.4 Keep-Alive Cron (Prevents Neon Sleep)

Neon free tier auto-sleeps after 5 minutes of inactivity. A Vercel cron job pings the database every 4 minutes to keep it permanently awake. This is standard practice for serverless databases.

```json
// vercel.json
{
  "crons": [{
    "path": "/api/health",
    "schedule": "*/4 * * * *"
  }]
}
```

```typescript
// src/app/api/health/route.ts
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  await db.execute(sql`SELECT 1`);
  return Response.json({ status: "ok", timestamp: new Date().toISOString() });
}
```

Result: Neon never sleeps. Every request is fast (~50ms). $0 cost.

### 3.5 Total Monthly Cost

```
Neon Postgres (free tier): $0.00
Vercel (Hobby):            $0.00
Firebase Auth (free):      $0.00
Cloudflare R2 (free tier): $0.00
Domain (yearly / 12):     ~$1.00
────────────────────────────────
TOTAL:                    ~$1.00/month (just the domain)
```

---

## 4. Folder Structure

```
src/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout (providers + global styles)
│   ├── page.tsx                      # Redirects to /login
│   ├── error.tsx                     # Global error boundary
│   ├── not-found.tsx                 # 404 page
│   │
│   ├── (auth)/                       # Public auth pages (no sidebar)
│   │   ├── layout.tsx                # Centered card layout
│   │   ├── login/page.tsx            # Google OAuth login
│   │   ├── signup/page.tsx           # Redirects to /login
│   │   ├── invite/[token]/page.tsx   # Invite acceptance
│   │   └── forgot-password/page.tsx  # Password recovery
│   │
│   ├── (platform)/                   # Protected app pages (sidebar + topbar)
│   │   ├── layout.tsx                # Shell: sidebar + topbar + auth gate
│   │   ├── dashboard/page.tsx        # Stats + recent activity
│   │   ├── records/page.tsx          # Record table + CRUD
│   │   ├── records/[id]/page.tsx     # Record detail view
│   │   ├── pipeline/page.tsx         # Kanban board
│   │   ├── chat/page.tsx             # Messaging
│   │   ├── employees/page.tsx        # Team management + invites
│   │   ├── activity/page.tsx         # Audit log viewer
│   │   ├── templates/page.tsx        # Document templates
│   │   └── settings/
│   │       ├── general/page.tsx      # Company name, labels
│   │       ├── fields/page.tsx       # Custom field builder
│   │       ├── branding/page.tsx     # Logo, colors, theme
│   │       ├── roles/page.tsx        # Custom role editor
│   │       └── billing/page.tsx      # Subscription management
│   │
│   ├── onboarding/page.tsx           # 4-step setup wizard
│   │
│   ├── super-admin/                  # Platform admin (super-admin only)
│   │   ├── layout.tsx                # Super-admin guard
│   │   ├── tenants/page.tsx          # Tenant management
│   │   ├── subscriptions/page.tsx    # Revenue dashboard
│   │   └── analytics/page.tsx        # Usage analytics
│   │
│   └── api/                          # Server-side API routes
│       ├── health/route.ts           # Keep-alive ping (Vercel cron)
│       ├── auth/route.ts             # Session verification
│       ├── onboarding/route.ts       # Workspace creation
│       ├── invites/route.ts          # Create & validate invites
│       ├── invites/accept/route.ts   # Accept invite
│       ├── records/route.ts          # List + create records
│       ├── records/[id]/route.ts     # Get + update + delete record
│       ├── records/bulk/route.ts     # Bulk operations
│       ├── fields/route.ts           # CRUD fields
│       ├── fields/reorder/route.ts   # Field ordering
│       ├── audit/route.ts            # Audit log queries
│       ├── export/route.ts           # Record export
│       ├── tenants/route.ts          # Tenant settings
│       ├── users/route.ts            # User management
│       ├── users/[id]/route.ts       # Single user ops
│       ├── views/route.ts            # Saved view CRUD
│       ├── pipeline/route.ts         # Pipeline stage management
│       ├── chat/route.ts             # Chat messages
│       ├── chat/sse/route.ts         # Server-Sent Events for real-time chat
│       ├── templates/route.ts        # Document templates
│       ├── notifications/route.ts    # Notification endpoints
│       ├── notifications/sse/route.ts # SSE for live notifications
│       ├── billing/
│       │   ├── checkout/route.ts     # Stripe Checkout session
│       │   └── webhook/route.ts      # Stripe webhook handler
│       └── whatsapp/
│           ├── send/route.ts         # Send WhatsApp message
│           └── webhook/route.ts      # Incoming message webhook
│
├── components/
│   ├── providers/
│   │   ├── app-providers.tsx         # Compose all providers
│   │   ├── auth-provider.tsx         # Auth state machine + routing
│   │   ├── query-provider.tsx        # React Query client config
│   │   └── permission-provider.tsx   # RBAC context
│   ├── guards/
│   │   ├── auth-guard.tsx            # Redirect if not authenticated
│   │   ├── role-guard.tsx            # Redirect if insufficient role
│   │   └── can.tsx                   # <Can permission="records.delete">
│   ├── layout/
│   │   ├── sidebar.tsx               # Collapsible navigation
│   │   ├── topbar.tsx                # Search, user menu, notifications
│   │   └── shell.tsx                 # Sidebar + topbar + content area
│   ├── ui/                           # Shadcn-style base components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── select.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── skeleton.tsx
│   │   ├── toast.tsx
│   │   ├── table.tsx
│   │   └── ...
│   ├── records/
│   │   ├── record-table.tsx          # TanStack Table with server-side data
│   │   ├── record-form.tsx           # Dynamic form from field definitions
│   │   ├── record-detail.tsx         # Full record view
│   │   ├── filter-builder.tsx        # Visual filter builder
│   │   └── field-renderer.tsx        # Renders field by type
│   ├── fields/
│   │   ├── field-editor.tsx          # Create/edit field modal
│   │   ├── field-list.tsx            # Sortable field list
│   │   └── field-type-picker.tsx     # Field type selector
│   └── shared/
│       ├── empty-state.tsx           # Empty state placeholder
│       ├── loading-spinner.tsx       # Loading indicator
│       ├── error-display.tsx         # Error state component
│       └── confirm-dialog.tsx        # Confirmation modal
│
├── db/
│   ├── index.ts                      # Neon/Drizzle connection
│   ├── schema.ts                     # Drizzle table definitions
│   └── migrations/                   # Drizzle migration files
│
├── lib/
│   ├── api/
│   │   ├── middleware.ts             # withAuth, withValidation
│   │   ├── errors.ts                 # AppError class + error codes
│   │   ├── response.ts              # success(), error() response helpers
│   │   └── query-builder.ts         # Filter → SQL translation engine
│   ├── firebase/
│   │   ├── client.ts                 # Firebase client SDK init
│   │   └── admin.ts                  # Firebase Admin SDK init
│   ├── permissions.ts                # RBAC permission map + helpers
│   └── utils.ts                      # Shared utility functions
│
├── hooks/
│   ├── queries/
│   │   ├── use-records.ts            # Records query + mutations
│   │   ├── use-fields.ts             # Fields query + mutations
│   │   ├── use-tenant.ts             # Tenant data + mutations
│   │   ├── use-users.ts              # Team members query
│   │   ├── use-audit.ts              # Audit logs query
│   │   └── use-auth.ts               # Auth state hook
│   ├── use-permission.ts             # usePermission() hook
│   └── use-sse.ts                    # SSE connection hook
│
├── stores/
│   ├── filter-store.ts               # Active filters + sort + search
│   ├── selection-store.ts            # Selected row IDs
│   └── ui-store.ts                   # Sidebar, modals, theme
│
├── validators/
│   ├── record.ts                     # Record create/update schemas
│   ├── field.ts                      # Field create/update schemas
│   ├── auth.ts                       # Auth/onboarding schemas
│   ├── invite.ts                     # Invite schemas
│   ├── tenant.ts                     # Tenant update schemas
│   └── common.ts                     # Shared schemas (pagination, filters)
│
└── types/
    ├── index.ts                      # Re-exports all types
    ├── database.ts                   # Drizzle inferred types
    ├── api.ts                        # API request/response types
    ├── auth.ts                       # Auth types
    ├── fields.ts                     # Field config discriminated unions
    ├── filters.ts                    # Filter types + operators
    └── permissions.ts                # Permission keys + role map
```

---

## 5. Database Schema

### 5.1 Complete PostgreSQL Schema

```sql
-- ═══════════════════════════════════════════
-- CORE TABLES
-- ═══════════════════════════════════════════

CREATE TABLE tenants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  logo_url          TEXT,
  primary_color     TEXT DEFAULT '#7C3AED',
  theme             TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  record_label      TEXT DEFAULT 'Records',
  record_label_singular TEXT DEFAULT 'Record',
  document_label    TEXT DEFAULT 'Documents',
  plan              TEXT DEFAULT 'free' CHECK (plan IN ('free','starter','professional','enterprise')),
  limits            JSONB DEFAULT '{"max_records":-1,"max_users":3,"max_fields":10,"max_storage_mb":500}',
  usage             JSONB DEFAULT '{"record_count":0,"user_count":1,"field_count":0,"storage_used_mb":0}',
  pipeline_config   JSONB DEFAULT '{"enabled":false,"stages":[]}',
  whatsapp_config   JSONB DEFAULT '{"enabled":false}',
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  subscription_status     TEXT DEFAULT 'free' CHECK (subscription_status IN ('free','trial','active','past_due','suspended')),
  trial_end_date    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  created_by        TEXT NOT NULL    -- Firebase UID
);

CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  firebase_uid      TEXT UNIQUE NOT NULL,
  email             TEXT NOT NULL,
  name              TEXT NOT NULL,
  avatar_url        TEXT,
  role              TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin','manager','employee','viewer')),
  status            TEXT DEFAULT 'active' CHECK (status IN ('active','invited','suspended')),
  permissions       JSONB NOT NULL,
  notification_prefs JSONB DEFAULT '{"email_digest":false,"record_assigned":true,"chat_mentions":true}',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  last_active       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, email)
);

CREATE TABLE fields (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  label             TEXT NOT NULL,
  type              TEXT NOT NULL CHECK (type IN ('text','textarea','number','phone','email','date','select','multi_select','file','url','currency','boolean')),
  field_order       INT NOT NULL,
  required          BOOLEAN DEFAULT false,
  sensitive         BOOLEAN DEFAULT false,
  filterable        BOOLEAN DEFAULT true,
  searchable        BOOLEAN DEFAULT true,
  show_in_table     BOOLEAN DEFAULT true,
  config            JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  created_by        TEXT NOT NULL,
  UNIQUE(tenant_id, field_order)
);

CREATE TABLE records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data              JSONB NOT NULL DEFAULT '{}',
  search_vector     TSVECTOR,
  pipeline_stage    TEXT,
  assigned_to       UUID REFERENCES users(id) ON DELETE SET NULL,
  tags              TEXT[] DEFAULT '{}',
  version           INT DEFAULT 1,
  deleted           BOOLEAN DEFAULT false,
  deleted_at        TIMESTAMPTZ,
  deleted_by        TEXT,
  created_by        TEXT NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_by        TEXT,
  updated_at        TIMESTAMPTZ
);

-- ═══════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════

-- Auto-update search_vector from all JSONB text values
CREATE OR REPLACE FUNCTION update_record_search_vector() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(array_to_string(
      ARRAY(SELECT value FROM jsonb_each_text(NEW.data) WHERE value IS NOT NULL),
      ' '
    ), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER records_search_update
  BEFORE INSERT OR UPDATE OF data ON records
  FOR EACH ROW EXECUTE FUNCTION update_record_search_vector();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER fields_updated_at BEFORE UPDATE ON fields FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ═══════════════════════════════════════════
-- ACTIVITY & AUDIT
-- ═══════════════════════════════════════════

CREATE TABLE activity (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id           TEXT NOT NULL,
  user_name         TEXT NOT NULL,
  user_role         TEXT NOT NULL,
  action            TEXT NOT NULL,
  entity_type       TEXT NOT NULL,
  entity_id         TEXT,
  entity_name       TEXT,
  changes           JSONB,
  snapshot          JSONB,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- INVITES
-- ═══════════════════════════════════════════

CREATE TABLE invites (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tenant_name       TEXT NOT NULL,
  email             TEXT NOT NULL,
  role              TEXT NOT NULL CHECK (role IN ('admin','manager','employee','viewer')),
  invited_by        TEXT NOT NULL,
  invited_by_name   TEXT NOT NULL,
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired')),
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at       TIMESTAMPTZ,
  accepted_by       TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- SAVED VIEWS
-- ═══════════════════════════════════════════

CREATE TABLE saved_views (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  filters           JSONB NOT NULL DEFAULT '{"match":"all","filters":[]}',
  sort              JSONB DEFAULT '[]',
  columns           JSONB DEFAULT '[]',
  shared            BOOLEAN DEFAULT false,
  pinned            BOOLEAN DEFAULT false,
  created_by        TEXT NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- CHAT
-- ═══════════════════════════════════════════

CREATE TABLE chat_rooms (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type              TEXT NOT NULL CHECK (type IN ('record','team','direct')),
  name              TEXT,
  record_id         UUID REFERENCES records(id) ON DELETE SET NULL,
  participants      TEXT[] NOT NULL,
  last_message_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE chat_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id           UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sender_id         TEXT NOT NULL,
  sender_name       TEXT NOT NULL,
  content           TEXT NOT NULL,
  attachments       JSONB DEFAULT '[]',
  read_by           TEXT[] DEFAULT '{}',
  edited            BOOLEAN DEFAULT false,
  deleted           BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- NOTIFICATIONS
-- ═══════════════════════════════════════════

CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id           TEXT NOT NULL,
  type              TEXT NOT NULL,
  title             TEXT NOT NULL,
  body              TEXT,
  link              TEXT,
  read              BOOLEAN DEFAULT false,
  actor_id          TEXT,
  actor_name        TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- TEMPLATES
-- ═══════════════════════════════════════════

CREATE TABLE templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  content           TEXT NOT NULL,
  field_mappings    JSONB NOT NULL DEFAULT '{}',
  created_by        TEXT NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- BILLING EVENTS (Stripe webhook audit trail)
-- ═══════════════════════════════════════════

CREATE TABLE billing_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id   TEXT UNIQUE NOT NULL,
  type              TEXT NOT NULL,
  tenant_id         UUID REFERENCES tenants(id),
  data              JSONB,
  processed         BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════

-- Records (the big table — optimized for 100k+ per tenant)
CREATE INDEX idx_records_tenant_active ON records(tenant_id, created_at DESC) WHERE deleted = false;
CREATE INDEX idx_records_pipeline ON records(tenant_id, pipeline_stage, created_at DESC) WHERE deleted = false;
CREATE INDEX idx_records_assigned ON records(tenant_id, assigned_to, created_at DESC) WHERE deleted = false;
CREATE INDEX idx_records_search ON records USING GIN(search_vector);
CREATE INDEX idx_records_data ON records USING GIN(data jsonb_path_ops);
CREATE INDEX idx_records_tags ON records USING GIN(tags);

-- Users
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_firebase ON users(firebase_uid);
CREATE INDEX idx_users_email ON users(email);

-- Fields
CREATE INDEX idx_fields_tenant ON fields(tenant_id, field_order);

-- Activity
CREATE INDEX idx_activity_tenant ON activity(tenant_id, created_at DESC);
CREATE INDEX idx_activity_action ON activity(tenant_id, action, created_at DESC);

-- Invites
CREATE INDEX idx_invites_email ON invites(email, tenant_id, status);
CREATE INDEX idx_invites_tenant ON invites(tenant_id, status);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id, read, created_at DESC);

-- Chat
CREATE INDEX idx_chat_rooms_tenant ON chat_rooms(tenant_id);
CREATE INDEX idx_messages_room ON chat_messages(room_id, created_at ASC);

-- Saved views
CREATE INDEX idx_views_tenant ON saved_views(tenant_id);
```

### 5.2 Complete Drizzle ORM Schema (TypeScript)

```typescript
// src/db/schema.ts — Type-safe table definitions
// Drizzle auto-generates migrations from this file

import {
  pgTable, uuid, text, boolean, integer, jsonb,
  timestamp, unique, index,
} from "drizzle-orm/pg-core";

// ── TENANTS ──────────────────────────────────────────

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#7C3AED"),
  theme: text("theme").default("dark"),
  recordLabel: text("record_label").default("Records"),
  recordLabelSingular: text("record_label_singular").default("Record"),
  documentLabel: text("document_label").default("Documents"),
  plan: text("plan").default("free"),
  limits: jsonb("limits").default({ max_records: -1, max_users: 3, max_fields: 10, max_storage_mb: 500 }),
  usage: jsonb("usage").default({ record_count: 0, user_count: 1, field_count: 0, storage_used_mb: 0 }),
  pipelineConfig: jsonb("pipeline_config").default({ enabled: false, stages: [] }),
  whatsappConfig: jsonb("whatsapp_config").default({ enabled: false }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").default("free"),
  trialEndDate: timestamp("trial_end_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  createdBy: text("created_by").notNull(),
});

// ── USERS ────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  firebaseUid: text("firebase_uid").unique().notNull(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("employee"),
  status: text("status").default("active"),
  permissions: jsonb("permissions").notNull(),
  notificationPrefs: jsonb("notification_prefs").default({ email_digest: false, record_assigned: true, chat_mentions: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  lastActive: timestamp("last_active", { withTimezone: true }).defaultNow(),
}, (t) => [
  unique().on(t.tenantId, t.email),
  index("idx_users_tenant").on(t.tenantId),
  index("idx_users_firebase").on(t.firebaseUid),
  index("idx_users_email").on(t.email),
]);

// ── FIELDS ───────────────────────────────────────────

export const fields = pgTable("fields", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  type: text("type").notNull(),
  fieldOrder: integer("field_order").notNull(),
  required: boolean("required").default(false),
  sensitive: boolean("sensitive").default(false),
  filterable: boolean("filterable").default(true),
  searchable: boolean("searchable").default(true),
  showInTable: boolean("show_in_table").default(true),
  config: jsonb("config").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  createdBy: text("created_by").notNull(),
}, (t) => [
  unique().on(t.tenantId, t.fieldOrder),
  index("idx_fields_tenant").on(t.tenantId, t.fieldOrder),
]);

// ── RECORDS ──────────────────────────────────────────

export const records = pgTable("records", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull().default({}),
  pipelineStage: text("pipeline_stage"),
  assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
  tags: text("tags").array().default([]),
  version: integer("version").default(1),
  deleted: boolean("deleted").default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: text("deleted_by"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

// ── ACTIVITY ─────────────────────────────────────────

export const activity = pgTable("activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  entityName: text("entity_name"),
  changes: jsonb("changes"),
  snapshot: jsonb("snapshot"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_activity_tenant").on(t.tenantId),
  index("idx_activity_action").on(t.tenantId, t.action),
]);

// ── INVITES ──────────────────────────────────────────

export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  tenantName: text("tenant_name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  invitedBy: text("invited_by").notNull(),
  invitedByName: text("invited_by_name").notNull(),
  status: text("status").default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  acceptedBy: text("accepted_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_invites_email").on(t.email, t.tenantId, t.status),
  index("idx_invites_tenant").on(t.tenantId, t.status),
]);

// ── SAVED VIEWS ──────────────────────────────────────

export const savedViews = pgTable("saved_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  filters: jsonb("filters").notNull().default({ match: "all", filters: [] }),
  sort: jsonb("sort").default([]),
  columns: jsonb("columns").default([]),
  shared: boolean("shared").default(false),
  pinned: boolean("pinned").default(false),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_views_tenant").on(t.tenantId),
]);

// ── CHAT ─────────────────────────────────────────────

export const chatRooms = pgTable("chat_rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  name: text("name"),
  recordId: uuid("record_id").references(() => records.id, { onDelete: "set null" }),
  participants: text("participants").array().notNull(),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_chat_rooms_tenant").on(t.tenantId),
]);

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id").notNull().references(() => chatRooms.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull(),
  senderName: text("sender_name").notNull(),
  content: text("content").notNull(),
  attachments: jsonb("attachments").default([]),
  readBy: text("read_by").array().default([]),
  edited: boolean("edited").default(false),
  deleted: boolean("deleted").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_messages_room").on(t.roomId),
]);

// ── NOTIFICATIONS ────────────────────────────────────

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),
  read: boolean("read").default(false),
  actorId: text("actor_id"),
  actorName: text("actor_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_notifications_user").on(t.userId, t.read),
]);

// ── TEMPLATES ────────────────────────────────────────

export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  content: text("content").notNull(),
  fieldMappings: jsonb("field_mappings").notNull().default({}),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── BILLING EVENTS ───────────────────────────────────

export const billingEvents = pgTable("billing_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  stripeEventId: text("stripe_event_id").unique().notNull(),
  type: text("type").notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  data: jsonb("data"),
  processed: boolean("processed").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
```

---

## 6. TypeScript Types & Contracts

### 6.1 User Roles & Permissions

```typescript
// src/types/permissions.ts

export type UserRole = "admin" | "manager" | "employee" | "viewer";

export type PermissionKey =
  | "records.create" | "records.read" | "records.update" | "records.delete"
  | "records.export" | "records.view_sensitive" | "records.bulk_actions"
  | "team.invite" | "team.remove" | "team.change_role" | "team.view_activity"
  | "chat.send" | "chat.delete_own"
  | "settings.edit_fields" | "settings.edit_branding" | "settings.edit_templates"
  | "settings.manage_views" | "settings.edit_pipeline" | "settings.manage_billing";

export type UserPermissions = Record<PermissionKey, boolean>;

// Default permission map — used when creating users
export const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  admin: {
    "records.create": true, "records.read": true, "records.update": true,
    "records.delete": true, "records.export": true, "records.view_sensitive": true,
    "records.bulk_actions": true, "team.invite": true, "team.remove": true,
    "team.change_role": true, "team.view_activity": true, "chat.send": true,
    "chat.delete_own": true, "settings.edit_fields": true, "settings.edit_branding": true,
    "settings.edit_templates": true, "settings.manage_views": true,
    "settings.edit_pipeline": true, "settings.manage_billing": true,
  },
  manager: {
    "records.create": true, "records.read": true, "records.update": true,
    "records.delete": true, "records.export": true, "records.view_sensitive": false,
    "records.bulk_actions": true, "team.invite": true, "team.remove": false,
    "team.change_role": false, "team.view_activity": true, "chat.send": true,
    "chat.delete_own": true, "settings.edit_fields": false, "settings.edit_branding": false,
    "settings.edit_templates": true, "settings.manage_views": true,
    "settings.edit_pipeline": false, "settings.manage_billing": false,
  },
  employee: {
    "records.create": true, "records.read": true, "records.update": true,
    "records.delete": false, "records.export": true, "records.view_sensitive": false,
    "records.bulk_actions": false, "team.invite": false, "team.remove": false,
    "team.change_role": false, "team.view_activity": false, "chat.send": true,
    "chat.delete_own": false, "settings.edit_fields": false, "settings.edit_branding": false,
    "settings.edit_templates": false, "settings.manage_views": true,
    "settings.edit_pipeline": false, "settings.manage_billing": false,
  },
  viewer: {
    "records.create": false, "records.read": true, "records.update": false,
    "records.delete": false, "records.export": false, "records.view_sensitive": false,
    "records.bulk_actions": false, "team.invite": false, "team.remove": false,
    "team.change_role": false, "team.view_activity": false, "chat.send": false,
    "chat.delete_own": false, "settings.edit_fields": false, "settings.edit_branding": false,
    "settings.edit_templates": false, "settings.manage_views": false,
    "settings.edit_pipeline": false, "settings.manage_billing": false,
  },
};
```

### 6.2 Auth Types

```typescript
// src/types/auth.ts

export interface AuthContext {
  uid: string;          // Firebase UID
  email: string;
  tenantId: string;     // From Postgres users table
  userId: string;       // Postgres user UUID
  role: UserRole;
  permissions: UserPermissions;
  userName: string;
}

export type AuthStatus = "idle" | "loading" | "authenticated" | "new_user" | "error";

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  tenant: Tenant | null;
  error: string | null;
  retry: () => void;
}
```

### 6.3 Field Config (Discriminated Union)

```typescript
// src/types/fields.ts

export type FieldType =
  | "text" | "textarea" | "number" | "phone" | "email"
  | "date" | "select" | "multi_select" | "file" | "url"
  | "currency" | "boolean";

export interface SelectOption {
  label: string;
  value: string;
  color?: string;   // For badge rendering
}

export type FieldConfig =
  | { type: "text"; max_length?: number; placeholder?: string }
  | { type: "textarea"; max_length?: number; placeholder?: string }
  | { type: "number"; min?: number; max?: number; precision?: number }
  | { type: "phone"; placeholder?: string }
  | { type: "email"; placeholder?: string }
  | { type: "date"; include_time?: boolean }
  | { type: "select"; options: SelectOption[] }
  | { type: "multi_select"; options: SelectOption[]; max_selections?: number }
  | { type: "file"; accept?: string[]; multiple?: boolean; max_size_mb?: number }
  | { type: "url"; open_in_new_tab?: boolean }
  | { type: "currency"; currency_code: string; min?: number; max?: number; precision?: number }
  | { type: "boolean"; default_value?: boolean };

export interface Field {
  id: string;
  tenantId: string;
  label: string;
  type: FieldType;
  fieldOrder: number;
  required: boolean;
  sensitive: boolean;
  filterable: boolean;
  searchable: boolean;
  showInTable: boolean;
  config: FieldConfig;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
```

### 6.4 Filter & Query Types

```typescript
// src/types/filters.ts

export type FilterOperator =
  // Text operators
  | "is" | "is_not" | "contains" | "not_contains"
  | "starts_with" | "ends_with" | "is_empty" | "is_not_empty"
  // Number operators
  | "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "between"
  // Date operators
  | "is_before" | "is_after" | "is_between"
  | "is_today" | "is_this_week" | "is_this_month"
  | "is_past" | "is_future"
  // Select operators
  | "is_any_of" | "is_none_of"
  // Boolean operators
  | "is_true" | "is_false";

export interface Filter {
  id: string;           // UUID for UI key
  fieldId: string;      // Field UUID or built-in field name
  operator: FilterOperator;
  value: unknown;       // Type depends on operator
}

export interface FilterGroup {
  match: "all" | "any";   // AND / OR
  filters: Filter[];
}

export interface SortConfig {
  fieldId: string;
  direction: "asc" | "desc";
}

export interface PaginationParams {
  page: number;
  pageSize: number;     // Default 50, max 100
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
```

### 6.5 API Response Types

```typescript
// src/types/api.ts

// Every API response follows this envelope
export type ApiResponse<T = unknown> =
  | { success: true; data: T }
  | { success: true; data: T[]; pagination: PaginationMeta }
  | { success: false; error: { code: ErrorCode; message: string; details?: unknown } };

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type ErrorCode =
  | "UNAUTHORIZED"         // No valid token
  | "FORBIDDEN"            // Valid token, insufficient permissions
  | "NOT_FOUND"            // Resource doesn't exist
  | "VALIDATION_ERROR"     // Zod validation failed
  | "CONFLICT"             // Duplicate resource
  | "RATE_LIMITED"         // Too many requests
  | "LIMIT_EXCEEDED"       // Plan limit reached
  | "INTERNAL_ERROR"       // Unexpected server error
  | "USER_NOT_FOUND"       // Firebase user not in Postgres
  | "TENANT_SUSPENDED"     // Billing issue
  | "INVITE_EXPIRED"       // Invite token expired
  | "INVITE_INVALID";      // Invite token doesn't exist
```

### 6.6 Database Inferred Types

```typescript
// src/types/database.ts

import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { tenants, users, fields, records, activity, invites, savedViews,
  chatRooms, chatMessages, notifications, templates, billingEvents } from "@/db/schema";

export type Tenant = InferSelectModel<typeof tenants>;
export type NewTenant = InferInsertModel<typeof tenants>;

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Field = InferSelectModel<typeof fields>;
export type NewField = InferInsertModel<typeof fields>;

export type Record = InferSelectModel<typeof records>;
export type NewRecord = InferInsertModel<typeof records>;

export type Activity = InferSelectModel<typeof activity>;
export type NewActivity = InferInsertModel<typeof activity>;

export type Invite = InferSelectModel<typeof invites>;
export type NewInvite = InferInsertModel<typeof invites>;

export type SavedView = InferSelectModel<typeof savedViews>;
export type ChatRoom = InferSelectModel<typeof chatRooms>;
export type ChatMessage = InferSelectModel<typeof chatMessages>;
export type Notification = InferSelectModel<typeof notifications>;
export type Template = InferSelectModel<typeof templates>;
export type BillingEvent = InferSelectModel<typeof billingEvents>;
```

---

## 7. Security Architecture

### 7.1 Defense in Depth — 4 Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: CLIENT                                                │
│  <Can> component hides unauthorized UI                          │
│  usePermission() hook gates client-side actions                 │
│  Zod validates form inputs before submission                    │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: API MIDDLEWARE                                        │
│  withAuth() — verifies Firebase ID token on EVERY request       │
│  Resolves user from Postgres by firebase_uid → gets tenant_id   │
│  withPermission(action) — checks RBAC before handler runs       │
│  withValidation(schema) — Zod validates request body/query      │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3: API HANDLER                                           │
│  Business logic operates on verified AuthContext                 │
│  tenant_id comes from verified user row, never from headers     │
│  All writes create audit log entries                            │
│  All queries include WHERE tenant_id = $1                       │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 4: POSTGRES ROW-LEVEL SECURITY (backup)                  │
│  Every table has RLS policies enforcing tenant_id isolation     │
│  Even if API is bypassed, data can't leak across tenants        │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Critical Security Rules

1. **Never trust client-provided tenant_id** — always derive from authenticated user's Postgres row
2. **Never expose Firebase Admin SDK credentials to the client** — server-only
3. **Never store secrets in code** — all secrets in environment variables
4. **Never return sensitive field values** unless user has `records.view_sensitive` permission
5. **Never skip Zod validation** — every API mutation validates input before DB write
6. **Always soft-delete records** — never `DELETE FROM records`
7. **Always log mutations to the activity table** — full audit trail

---

## 8. Authentication & Session Management

### 8.1 Auth State Machine

```
IDLE → onAuthStateChanged(user) → LOADING → POST /api/auth { token }
  → 200: AUTHENTICATED → /dashboard
  → 404: NEW_USER → /onboarding
  → 401: token invalid → SIGNED_OUT → /login
  → 500: ERROR → show retry button

signOut() → clear React Query cache + Zustand → /login
```

### 8.2 AuthProvider Contract

```typescript
// src/components/providers/auth-provider.tsx

// MUST:
// 1. Use AbortController to cancel in-flight requests on unmount
// 2. Track request generation to discard stale responses
// 3. Expose error state to UI (not just console.log)
// 4. Provide retry mechanism
// 5. Clear all state on signOut

interface AuthState {
  status: "idle" | "loading" | "authenticated" | "new_user" | "error";
  user: User | null;
  tenant: Tenant | null;
  error: string | null;
  retry: () => void;
}

// Implementation pattern:
// 1. Firebase onAuthStateChanged fires with user object
// 2. If user is null → status = "idle", redirect to /login
// 3. If user exists → get idToken → POST /api/auth with Bearer token
// 4. API verifies token with Firebase Admin SDK
// 5. API looks up user in Postgres by firebase_uid
// 6. If found → return { user, tenant } → status = "authenticated"
// 7. If not found → return 404 → status = "new_user" → redirect to /onboarding
```

### 8.3 Token Refresh

```typescript
// Firebase tokens expire after 1 hour
// React Query interceptor refreshes token before API calls:

async function apiClient(url: string, options?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();  // Auto-refreshes if expired
  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}
```

---

## 9. API Layer — Middleware & Routes

### 9.1 withAuth() — Token to User Resolution

```typescript
// src/lib/api/middleware.ts

// Flow:
// 1. Extract Bearer token from Authorization header
// 2. Firebase Admin verifyIdToken(token) → { uid, email }
// 3. SELECT * FROM users WHERE firebase_uid = $1
// 4. If not found → 404 (new user, needs onboarding)
// 5. If found → build AuthContext from user row
// 6. If permission specified → check ctx.permissions[action]
// 7. Pass AuthContext to handler

type AuthenticatedHandler = (req: NextRequest, ctx: AuthContext) => Promise<Response>;
type ValidatedHandler<T> = (req: NextRequest, ctx: AuthContext, body: T) => Promise<Response>;

export function withAuth(handler: AuthenticatedHandler): RouteHandler;
export function withAuth(permission: PermissionKey, handler: AuthenticatedHandler): RouteHandler;
```

### 9.2 withValidation() — Zod Schema Enforcement

```typescript
// Validates request body against Zod schema before handler executes
// Returns 400 with validation errors if schema fails

export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: ValidatedHandler<T>
): AuthenticatedHandler;
```

### 9.3 Middleware Composition Examples

```typescript
// Authenticated route:
export const GET = withAuth(async (req, ctx) => { ... });

// Authenticated + permission:
export const POST = withAuth("records.create", async (req, ctx) => { ... });

// Authenticated + permission + validation:
export const POST = withAuth("records.create",
  withValidation(createRecordSchema, async (req, ctx, body) => { ... })
);
```

### 9.4 API Route Specifications

| Method | Route | Auth | Permission | Description |
|---|---|---|---|---|
| `POST` | `/api/auth` | Token only | — | Verify session, return user+tenant |
| `POST` | `/api/onboarding` | Token only | — | Create workspace |
| `POST` | `/api/invites` | Yes | `team.invite` | Send invitation |
| `GET` | `/api/invites?id=` | No | — | Validate invite (public) |
| `POST` | `/api/invites/accept` | Token only | — | Accept invitation |
| `GET` | `/api/records` | Yes | `records.read` | List records (paginated, filtered) |
| `POST` | `/api/records` | Yes | `records.create` | Create record |
| `GET` | `/api/records/[id]` | Yes | `records.read` | Get single record |
| `PUT` | `/api/records/[id]` | Yes | `records.update` | Update record |
| `DELETE` | `/api/records/[id]` | Yes | `records.delete` | Soft-delete record |
| `POST` | `/api/records/bulk` | Yes | `records.bulk_actions` | Bulk operations |
| `GET` | `/api/fields` | Yes | — | List fields |
| `POST` | `/api/fields` | Yes | `settings.edit_fields` | Create field |
| `PUT` | `/api/fields` | Yes | `settings.edit_fields` | Update field |
| `DELETE` | `/api/fields` | Yes | `settings.edit_fields` | Delete field |
| `PUT` | `/api/fields/reorder` | Yes | `settings.edit_fields` | Reorder fields |
| `GET` | `/api/audit` | Yes | `team.view_activity` | Query audit logs |
| `POST` | `/api/export` | Yes | `records.export` | Export records |
| `GET` | `/api/tenants` | Yes | — | Get tenant settings |
| `PUT` | `/api/tenants` | Yes | `settings.edit_branding` | Update settings |
| `GET` | `/api/users` | Yes | `team.invite` | List team members |
| `PUT` | `/api/users/[id]` | Yes | `team.change_role` | Change role |
| `DELETE` | `/api/users/[id]` | Yes | `team.remove` | Remove member |
| `GET` | `/api/views` | Yes | `settings.manage_views` | List saved views |
| `POST` | `/api/views` | Yes | `settings.manage_views` | Create saved view |
| `PUT` | `/api/views` | Yes | `settings.manage_views` | Update saved view |
| `DELETE` | `/api/views` | Yes | `settings.manage_views` | Delete saved view |
| `GET` | `/api/pipeline` | Yes | — | Get pipeline config |
| `PUT` | `/api/pipeline` | Yes | `settings.edit_pipeline` | Update pipeline config |
| `GET` | `/api/chat` | Yes | `chat.send` | List chat rooms |
| `POST` | `/api/chat` | Yes | `chat.send` | Send message |
| `GET` | `/api/chat/sse` | Yes | `chat.send` | Real-time chat stream |
| `GET` | `/api/notifications` | Yes | — | List notifications |
| `PUT` | `/api/notifications` | Yes | — | Mark as read |
| `GET` | `/api/notifications/sse` | Yes | — | Real-time notification stream |
| `GET` | `/api/templates` | Yes | — | List templates |
| `POST` | `/api/templates` | Yes | `settings.edit_templates` | Create template |
| `PUT` | `/api/templates` | Yes | `settings.edit_templates` | Update template |
| `DELETE` | `/api/templates` | Yes | `settings.edit_templates` | Delete template |
| `POST` | `/api/billing/checkout` | Yes | `settings.manage_billing` | Stripe session |
| `POST` | `/api/billing/webhook` | Stripe sig | — | Stripe events |
| `POST` | `/api/whatsapp/send` | Yes | `chat.send` | Send WhatsApp |
| `POST` | `/api/whatsapp/webhook` | WA sig | — | Receive WhatsApp |

---

## 10. State Management Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        REACT COMPONENTS                         │
│                                                                 │
│  useRecords(filters, sort, page)   useFilterStore()             │
│  useFields()   useTenant()         useSelectionStore()          │
│       │            │                    │                        │
│       ▼            ▼                    ▼                        │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐  │
│  │   REACT QUERY CACHE     │  │   ZUSTAND STORES            │  │
│  │   (Server State)        │  │   (Client UI State)         │  │
│  │                         │  │                             │  │
│  │  records: Page<Record>  │  │  filters: FilterGroup       │  │
│  │  fields: Field[]        │  │  sort: SortConfig[]         │  │
│  │  tenant: Tenant         │  │  searchQuery: string        │  │
│  │  users: User[]          │  │  selectedIds: Set<string>   │  │
│  │  auditLogs: Page<Log>   │  │  sidebarCollapsed: boolean  │  │
│  │                         │  │  activeModal: string | null │  │
│  │  PAGINATED responses    │  │  theme: "dark" | "light"    │  │
│  │  keepPreviousData: true │  │                             │  │
│  └─────────────────────────┘  └──────────────┬──────────────┘  │
│               │                               │                 │
│               ▼                               │                 │
│  ┌─────────────────────────┐                 │                 │
│  │   POSTGRES (via API)    │◀────────────────┘                 │
│  │                         │  Filters sent as query params     │
│  │  SQL WHERE + ORDER BY   │  Server builds SQL from filters   │
│  │  + LIMIT/OFFSET         │  Returns page of 50 records      │
│  │  Full-text search       │                                   │
│  └─────────────────────────┘                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 10.1 React Query Configuration

```typescript
// src/components/providers/query-provider.tsx

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,          // Data fresh for 30s
      gcTime: 5 * 60_000,         // Cache kept for 5 min
      refetchOnWindowFocus: true,  // Refresh when tab gets focus
      retry: (count, error) => {
        // Don't retry auth/permission errors
        if (error instanceof AppError && ["UNAUTHORIZED", "FORBIDDEN"].includes(error.code)) {
          return false;
        }
        return count < 3;
      },
    },
  },
});
```

### 10.2 Zustand Store Pattern

```typescript
// src/stores/filter-store.ts

interface FilterStore {
  filters: FilterGroup;
  sort: SortConfig[];
  search: string;
  page: number;
  pageSize: number;
  setFilters: (filters: FilterGroup) => void;
  setSort: (sort: SortConfig[]) => void;
  setSearch: (search: string) => void;
  setPage: (page: number) => void;
  reset: () => void;
}

// Zustand NEVER holds server data — only UI state that drives queries
// When filters change → React Query key changes → new fetch → fresh data
```

---

## 11. Role-Based Access Control (RBAC)

### 11.1 Permission Matrix

```
Permission Key             admin   manager   employee   viewer
─────────────────────────────────────────────────────────────
records.create               ✓        ✓         ✓         ✗
records.read                 ✓        ✓         ✓         ✓
records.update               ✓        ✓         ✓         ✗
records.delete               ✓        ✓         ✗         ✗
records.export               ✓        ✓         ✓         ✗
records.view_sensitive       ✓        ✗         ✗         ✗
records.bulk_actions         ✓        ✓         ✗         ✗

team.invite                  ✓        ✓         ✗         ✗
team.remove                  ✓        ✗         ✗         ✗
team.change_role             ✓        ✗         ✗         ✗
team.view_activity           ✓        ✓         ✗         ✗

chat.send                    ✓        ✓         ✓         ✗
chat.delete_own              ✓        ✓         ✗         ✗

settings.edit_fields         ✓        ✗         ✗         ✗
settings.edit_branding       ✓        ✗         ✗         ✗
settings.edit_templates      ✓        ✓         ✗         ✗
settings.manage_views        ✓        ✓         ✓         ✗
settings.edit_pipeline       ✓        ✗         ✗         ✗
settings.manage_billing      ✓        ✗         ✗         ✗
```

### 11.2 Client-Side Permission Checks

```typescript
// <Can> component — conditional rendering based on permission
<Can permission="records.delete">
  <Button onClick={handleDelete}>Delete</Button>
</Can>

// usePermission() hook — imperative permission check
const canEdit = usePermission("records.update");

// Both read from AuthContext.permissions (set by withAuth from Postgres)
// These are UI conveniences only — API enforces permissions independently
```

### 11.3 Server-Side Permission Enforcement

```typescript
// Every API route that mutates data checks permissions:
export const DELETE = withAuth("records.delete", async (req, ctx) => {
  // This handler ONLY executes if ctx.permissions["records.delete"] === true
  // withAuth returns 403 automatically if permission is denied
});
```

---

## 12. Custom Field System

### 12.1 Supported Field Types (12)

| Type | Input | Required Config | Optional Config |
|---|---|---|---|
| `text` | Text input | — | max_length, placeholder |
| `textarea` | Multi-line | — | max_length, placeholder |
| `number` | Number input | — | min, max, precision |
| `phone` | Phone input | — | placeholder |
| `email` | Email input | — | placeholder |
| `date` | Date picker | — | include_time |
| `select` | Dropdown | **options[]** | placeholder |
| `multi_select` | Multi-dropdown | **options[]** | max_selections |
| `file` | Dropzone upload | — | accept[], multiple, max_size_mb |
| `url` | URL input | — | open_in_new_tab |
| `currency` | Currency input | **currency_code** | min, max, precision |
| `boolean` | Toggle switch | — | default_value |

### 12.2 How Dynamic Fields Work in Postgres

```sql
-- Record data stored as JSONB — keys are field UUIDs:
INSERT INTO records (tenant_id, data, created_by) VALUES (
  $1,
  '{
    "f_abc123": "John Smith",
    "f_def456": "john@example.com",
    "f_ghi789": "Active",
    "f_jkl012": 75000
  }',
  $2
);

-- Query dynamic fields:
SELECT * FROM records
WHERE tenant_id = $1
  AND deleted = false
  AND data->>'f_ghi789' = 'Active'
  AND (data->>'f_jkl012')::numeric > 50000
ORDER BY created_at DESC
LIMIT 50;

-- The GIN index on data covers ALL dynamic field queries automatically.
-- No per-field index creation needed.
```

### 12.3 Default Fields (Created During Onboarding)

Every new tenant gets these fields automatically:

| Field | Type | Required | Show in Table |
|---|---|---|---|
| Name | text | Yes | Yes |
| Email | email | No | Yes |
| Phone | phone | No | Yes |
| Status | select (Active/Inactive/Lead) | No | Yes |
| Notes | textarea | No | No |

---

## 13. Server-Side Query Engine

### 13.1 Filter → SQL Translation

```typescript
// src/lib/api/query-builder.ts

function buildRecordQuery(
  tenantId: string,
  filters: FilterGroup,
  sort: SortConfig[],
  search: string | null,
  page: number,
  pageSize: number
) {
  let query = db.select().from(records)
    .where(and(
      eq(records.tenantId, tenantId),
      eq(records.deleted, false),
    ));

  // Apply each filter
  for (const filter of filters.filters) {
    const path = `data->>'${filter.fieldId}'`;

    switch (filter.operator) {
      case "is":          query = query.where(sql`${path} = ${filter.value}`); break;
      case "is_not":      query = query.where(sql`${path} != ${filter.value}`); break;
      case "contains":    query = query.where(sql`${path} ILIKE ${'%' + filter.value + '%'}`); break;
      case "starts_with": query = query.where(sql`${path} ILIKE ${filter.value + '%'}`); break;
      case "ends_with":   query = query.where(sql`${path} ILIKE ${'%' + filter.value}`); break;
      case "gt":          query = query.where(sql`(${path})::numeric > ${filter.value}`); break;
      case "gte":         query = query.where(sql`(${path})::numeric >= ${filter.value}`); break;
      case "lt":          query = query.where(sql`(${path})::numeric < ${filter.value}`); break;
      case "lte":         query = query.where(sql`(${path})::numeric <= ${filter.value}`); break;
      case "between":     query = query.where(sql`(${path})::numeric BETWEEN ${filter.value[0]} AND ${filter.value[1]}`); break;
      case "is_before":   query = query.where(sql`(${path})::timestamptz < ${filter.value}`); break;
      case "is_after":    query = query.where(sql`(${path})::timestamptz > ${filter.value}`); break;
      case "is_today":    query = query.where(sql`(${path})::date = CURRENT_DATE`); break;
      case "is_this_week": query = query.where(sql`(${path})::date >= date_trunc('week', CURRENT_DATE)`); break;
      case "is_this_month": query = query.where(sql`(${path})::date >= date_trunc('month', CURRENT_DATE)`); break;
      case "is_empty":    query = query.where(sql`${path} IS NULL OR ${path} = ''`); break;
      case "is_not_empty": query = query.where(sql`${path} IS NOT NULL AND ${path} != ''`); break;
      case "is_any_of":   query = query.where(sql`${path} = ANY(${filter.value})`); break;
      case "is_none_of":  query = query.where(sql`${path} != ALL(${filter.value})`); break;
      case "is_true":     query = query.where(sql`(${path})::boolean = true`); break;
      case "is_false":    query = query.where(sql`(${path})::boolean = false`); break;
    }
  }

  // Full-text search
  if (search) {
    query = query.where(sql`search_vector @@ plainto_tsquery('english', ${search})`);
  }

  // Sort
  for (const s of sort) {
    const dir = s.direction === "asc" ? sql`ASC` : sql`DESC`;
    query = query.orderBy(sql`data->>'${s.fieldId}' ${dir}`);
  }

  // Default sort: newest first
  if (sort.length === 0) {
    query = query.orderBy(sql`created_at DESC`);
  }

  // Pagination (offset-based)
  const offset = (page - 1) * pageSize;
  query = query.limit(pageSize).offset(offset);

  return query;
}
```

### 13.2 Count Query (for pagination metadata)

```typescript
// Separate count query for total (runs in parallel with data query)
async function getRecordCount(tenantId: string, filters: FilterGroup, search: string | null) {
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(records)
    .where(and(
      eq(records.tenantId, tenantId),
      eq(records.deleted, false),
      // Same filter conditions as buildRecordQuery
    ));
  return result[0].count;
}
```

### 13.3 Dashboard Aggregations (Free with Postgres)

```sql
-- Record count by pipeline stage
SELECT pipeline_stage, COUNT(*) FROM records
WHERE tenant_id = $1 AND deleted = false
GROUP BY pipeline_stage;

-- Records created per month
SELECT date_trunc('month', created_at) AS month, COUNT(*)
FROM records WHERE tenant_id = $1 AND deleted = false
GROUP BY month ORDER BY month DESC;

-- Average deal value by stage
SELECT pipeline_stage, AVG((data->>'deal_value')::numeric)
FROM records WHERE tenant_id = $1 AND deleted = false
GROUP BY pipeline_stage;

-- Team productivity
SELECT created_by, COUNT(*) AS records_created
FROM records WHERE tenant_id = $1 AND created_at > now() - INTERVAL '30 days'
GROUP BY created_by ORDER BY records_created DESC;
```

---

## 14. Real-Time Data Sync

### 14.1 Server-Sent Events (SSE) Implementation

```typescript
// src/app/api/notifications/sse/route.ts
export async function GET(req: NextRequest) {
  const ctx = await verifyAuth(req);

  const stream = new ReadableStream({
    start(controller) {
      let lastCheck = new Date();

      // Poll Postgres every 3 seconds for new notifications
      const interval = setInterval(async () => {
        const newNotifications = await db.select()
          .from(notifications)
          .where(and(
            eq(notifications.userId, ctx.uid),
            eq(notifications.read, false),
            gt(notifications.createdAt, lastCheck),
          ));

        if (newNotifications.length > 0) {
          controller.enqueue(`data: ${JSON.stringify(newNotifications)}\n\n`);
          lastCheck = new Date();
        }
      }, 3000);

      req.signal.addEventListener("abort", () => clearInterval(interval));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

### 14.2 Client-Side SSE Hook

```typescript
// src/hooks/use-sse.ts
function useSSE<T>(url: string, onMessage: (data: T) => void) {
  useEffect(() => {
    const eventSource = new EventSource(url);
    eventSource.onmessage = (event) => onMessage(JSON.parse(event.data));
    eventSource.onerror = () => {
      eventSource.close();
      // Reconnect after 5 seconds
      setTimeout(() => {
        // Re-establish connection
      }, 5000);
    };
    return () => eventSource.close();
  }, [url]);
}

// Usage:
useSSE("/api/notifications/sse", (notifications) => {
  queryClient.invalidateQueries({ queryKey: ["notifications"] });
  toast(`${notifications.length} new notifications`);
});
```

### 14.3 What Gets Real-Time Updates

| Feature | Method | Frequency |
|---|---|---|
| Notifications | SSE stream | 3s polling server-side |
| Chat messages | SSE stream per room | 2s polling when room open |
| Record table | React Query refetch on focus | 30s stale time + manual refresh |
| Pipeline board | React Query refetch on focus | 30s stale time |
| New record toast | Polling record count | 30s interval |

---

## 15. Onboarding Flow

### 15.1 When It Triggers

A user who signs in with Google OAuth but has **no entry in the `users` table** is redirected to `/onboarding`. The `/api/auth` endpoint returns `404` with code `USER_NOT_FOUND`, which the AuthProvider interprets as `status: "new_user"`.

### 15.2 Four-Step Wizard

```
Step 1: Company Details
  - Company name (required)
  - Industry (select: manpower, real estate, sales, HR, other)
  - Company size (select: 1-10, 11-50, 51-200, 200+)

Step 2: Branding
  - Upload logo (optional, Firebase Storage)
  - Pick primary color (color picker, default #7C3AED)
  - Choose theme (dark/light, default dark)

Step 3: Customize Labels
  - Record label (default "Records" — e.g. "Candidates", "Leads", "Properties")
  - Record label singular (default "Record")
  - Document label (default "Documents")

Step 4: Review & Create
  - Summary of all choices
  - "Create Workspace" button
```

### 15.3 API: POST /api/onboarding

```typescript
// Request body (Zod validated):
{
  companyName: string;          // Required, min 2 chars
  industry?: string;
  companySize?: string;
  logoUrl?: string;
  primaryColor?: string;        // Hex color
  theme?: "dark" | "light";
  recordLabel?: string;
  recordLabelSingular?: string;
  documentLabel?: string;
}

// Server-side transaction:
// 1. Create tenant row with provided settings
// 2. Create user row (admin role, full permissions) linked to Firebase UID
// 3. Create 5 default fields (Name, Email, Phone, Status, Notes)
// 4. Log activity: "Workspace created"
// 5. Return { user, tenant }

// All 4 operations run in a single Postgres transaction — if any fails, all roll back.
```

---

## 16. Invite & Team Management

### 16.1 Invite Flow

```
ADMIN/MANAGER creates invite:
  POST /api/invites { email, role }
  → Creates invite row (status: "pending", expires: 7 days)
  → Returns invite link: /invite/{invite_id}
  → (Future: sends email via SendGrid/Resend)

INVITEE clicks link:
  GET /invite/{invite_id} (client page)
  → Fetches GET /api/invites?id={invite_id} (public, no auth)
  → Shows invite details: "You've been invited to {tenant_name} as {role}"
  → "Sign in with Google to accept"

INVITEE signs in and accepts:
  POST /api/invites/accept { inviteId }
  → Verifies: invite exists, not expired, not already accepted
  → Creates user row with invite's role and permissions
  → Updates invite status to "accepted"
  → Redirects to /dashboard
```

### 16.2 Team Management

```
GET /api/users — List all users in tenant
  Returns: id, name, email, role, status, lastActive, createdAt

PUT /api/users/[id] { role } — Change user's role
  Admin only. Cannot change own role. Cannot change last admin.
  Updates user.role and user.permissions (from ROLE_PERMISSIONS map).
  Logs activity: "Changed {user} role from {old} to {new}"

DELETE /api/users/[id] — Remove user from tenant
  Admin only. Cannot remove self. Cannot remove last admin.
  Sets user.status = "suspended" (soft delete).
  Logs activity: "Removed {user} from workspace"
```

### 16.3 Role Hierarchy

```
admin > manager > employee > viewer

Rules:
- Admins can manage all roles below them
- Managers can invite employees and viewers
- There must always be at least 1 admin per tenant
- Role changes take effect immediately (permissions updated in DB)
```

---

## 17. File Storage & Upload

### 17.1 Storage Provider — Cloudflare R2

**Why R2 over Firebase Storage:**
- 10 GB free (vs 5 GB Firebase)
- **$0 egress fees** (Firebase charges per download)
- S3-compatible API — migrates to MinIO on VPS with zero code changes
- Keeps Firebase limited to auth only (one less dependency)

**Free tier limits:**
- 10 GB storage
- 10 million Class B reads/month
- 1 million Class A writes/month
- **$0 egress — always**

### 17.2 Storage Structure

```
bucket: crm-whatstask/
  tenants/
    {tenant_id}/
      logos/
        logo.png                    # Tenant logo
      records/
        {record_id}/
          {field_id}/
            {timestamp}_{filename}  # Uploaded file
      chat/
        {room_id}/
          {timestamp}_{filename}    # Chat attachments
```

### 17.3 Upload Flow (Presigned URLs)

```
1. Client: react-dropzone captures file
2. Client: Validate file type/size against field config
3. Client: POST /api/upload/presign { filename, contentType, path }
4. Server: Verify auth + tenant_id + file size limits
5. Server: Generate presigned PUT URL from R2 (valid 5 minutes)
6. Server: Return { uploadUrl, publicUrl }
7. Client: PUT file directly to R2 using presigned URL (no server bandwidth)
8. Client: Save publicUrl in record data JSONB (via PUT /api/records/[id])
```

```typescript
// src/app/api/upload/presign/route.ts
// Server generates presigned URL — client uploads directly to R2

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// Generate presigned URL for direct upload
const command = new PutObjectCommand({
  Bucket: process.env.R2_BUCKET_NAME,
  Key: `tenants/${ctx.tenantId}/records/${recordId}/${fieldId}/${timestamp}_${filename}`,
  ContentType: contentType,
});
const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 });
```

### 17.4 VPS Migration Path

```typescript
// TODAY (Cloudflare R2)
const r2 = new S3Client({
  endpoint: "https://xxx.r2.cloudflarestorage.com",
  credentials: { accessKeyId: "...", secretAccessKey: "..." },
});

// FUTURE (MinIO on VPS — same S3 API, change endpoint only)
const r2 = new S3Client({
  endpoint: "http://localhost:9000",
  credentials: { accessKeyId: "...", secretAccessKey: "..." },
});

// Migration: rclone sync r2:bucket minio:bucket (one command)
```

### 17.5 File Size Limits

| Plan | Max File Size | Max Storage |
|---|---|---|
| Free | 5 MB | 500 MB |
| Starter | 10 MB | 5 GB |
| Professional | 25 MB | 25 GB |
| Enterprise | 50 MB | 100 GB |

---

## 18. Audit Logging System

### 18.1 What Gets Logged

Every mutation in the system creates an activity row:

| Action | Entity Type | What's Captured |
|---|---|---|
| `record.created` | record | Full record snapshot |
| `record.updated` | record | Changed fields only (before/after) |
| `record.deleted` | record | Record ID + name |
| `record.restored` | record | Record ID |
| `record.bulk_deleted` | record | Array of record IDs |
| `field.created` | field | Field definition |
| `field.updated` | field | Changed properties |
| `field.deleted` | field | Field ID + label |
| `user.invited` | user | Email + role |
| `user.accepted_invite` | user | Email |
| `user.role_changed` | user | Old role → new role |
| `user.removed` | user | Email |
| `tenant.updated` | tenant | Changed settings |
| `view.created` | view | View name + filters |
| `pipeline.updated` | pipeline | Stage changes |

### 18.2 Activity Row Structure

```typescript
{
  id: "uuid",
  tenantId: "uuid",
  userId: "firebase_uid",        // Who did it
  userName: "John Smith",        // Denormalized for display
  userRole: "admin",             // Role at time of action
  action: "record.updated",      // What happened
  entityType: "record",          // What type of thing
  entityId: "uuid",              // Which thing
  entityName: "John Smith",      // Human-readable name
  changes: {                     // What changed (for updates)
    "f_status": { from: "Lead", to: "Active" },
    "f_salary": { from: 50000, to: 75000 }
  },
  snapshot: { ... },             // Full state (for creates)
  createdAt: "2026-03-10T..."
}
```

### 18.3 Querying Audit Logs

```
GET /api/audit?page=1&pageSize=50&action=record.updated&entityType=record&userId=abc
```

All parameters are optional. Results are sorted by `created_at DESC` (newest first).

---

## 19. Pipeline / Kanban Board

### 19.1 Pipeline Configuration

Stored in `tenants.pipeline_config` (JSONB):

```typescript
{
  enabled: true,
  stages: [
    { id: "new", label: "New Lead", color: "#3B82F6", order: 0 },
    { id: "contacted", label: "Contacted", color: "#F59E0B", order: 1 },
    { id: "qualified", label: "Qualified", color: "#8B5CF6", order: 2 },
    { id: "proposal", label: "Proposal Sent", color: "#EC4899", order: 3 },
    { id: "won", label: "Won", color: "#10B981", order: 4 },
    { id: "lost", label: "Lost", color: "#EF4444", order: 5 },
  ]
}
```

### 19.2 How It Works

- Records have a `pipeline_stage` column that maps to a stage ID
- Kanban board shows columns = stages, cards = records in that stage
- Drag-and-drop moves a record between stages → `PUT /api/records/[id] { pipeline_stage: "qualified" }`
- Each column shows count and can be collapsed
- Cards show configurable fields (first 3 fields by default)

### 19.3 Pipeline Queries

```sql
-- Records per stage (for column counts)
SELECT pipeline_stage, COUNT(*) FROM records
WHERE tenant_id = $1 AND deleted = false AND pipeline_stage IS NOT NULL
GROUP BY pipeline_stage;

-- Records in a specific stage (paginated)
SELECT * FROM records
WHERE tenant_id = $1 AND deleted = false AND pipeline_stage = $2
ORDER BY updated_at DESC
LIMIT 20;
```

---

## 20. Chat & Messaging

### 20.1 Chat Room Types

| Type | Description | Created When |
|---|---|---|
| `record` | Attached to a specific record | First message on a record |
| `team` | Tenant-wide group chat | During onboarding (auto) |
| `direct` | 1:1 between two users | First DM sent |

### 20.2 Message Flow

```
1. User types message in chat UI
2. POST /api/chat { roomId, content, attachments? }
3. Server: validates auth + permission (chat.send)
4. Server: INSERT into chat_messages
5. Server: UPDATE chat_rooms SET last_message_at = now()
6. Server: Create notification for other participants
7. Client: SSE stream picks up new message within 2s
8. Other clients: React Query invalidation shows new message
```

### 20.3 @Mentions

```typescript
// Message content supports @mentions:
// "Hey @[John Smith](user_abc123), check this record"

// When a message contains @mentions:
// 1. Parse mentioned user IDs from content
// 2. Create notification for each mentioned user
// 3. Notification type: "chat_mention"
// 4. Link points to the chat room
```

### 20.4 Chat SSE Stream

```
GET /api/chat/sse?roomId={roomId}

Server polls chat_messages every 2 seconds for messages
newer than the last sent timestamp. Sends new messages
as SSE events to all connected clients in that room.
```

---

## 21. Notification System

### 21.1 Notification Types

| Type | Trigger | Recipients |
|---|---|---|
| `record_assigned` | Record assigned to user | Assigned user |
| `record_updated` | Record edited | Creator + assigned user |
| `chat_mention` | @mentioned in chat | Mentioned user |
| `chat_message` | New message in room | Room participants |
| `invite_received` | Invited to workspace | Invitee (shown after sign-in) |
| `role_changed` | Role updated | Affected user |
| `pipeline_moved` | Record moved to new stage | Creator + assigned user |

### 21.2 Notification Preferences

Stored in `users.notification_prefs` (JSONB):

```typescript
{
  email_digest: false,        // Daily email summary (Phase 4+)
  record_assigned: true,      // Notify when record assigned to me
  chat_mentions: true,        // Notify when @mentioned
}
```

### 21.3 API Endpoints

```
GET /api/notifications?page=1&pageSize=20
  → Returns paginated notifications for current user
  → Sorted by created_at DESC

PUT /api/notifications { ids: ["uuid1", "uuid2"], read: true }
  → Mark notifications as read

GET /api/notifications/sse
  → SSE stream for real-time notification delivery
```

---

## 22. Document Templates & PDF Generation

### 22.1 Template System

Templates are HTML strings with `{{placeholder}}` variables that map to record fields.

```typescript
// Template example:
{
  name: "Employment Offer Letter",
  content: "<h1>Offer Letter</h1><p>Dear {{f_name}}, ...</p>",
  fieldMappings: {
    "f_name": "Name",
    "f_email": "Email",
    "f_salary": "Salary",
    "f_start_date": "Start Date"
  }
}
```

### 22.2 PDF Generation Flow

```
1. User clicks "Generate PDF" on a record
2. Client: Fetches template + record data
3. Client: Replaces {{placeholders}} with record values
4. Client: Renders via @react-pdf/renderer
5. Client: Downloads PDF file

All PDF generation happens client-side — no server cost.
```

### 22.3 API Endpoints

```
GET /api/templates — List all templates for tenant
POST /api/templates { name, content, fieldMappings } — Create template
PUT /api/templates { id, name, content, fieldMappings } — Update template
DELETE /api/templates { id } — Delete template
```

---

## 23. WhatsApp Integration

### 23.1 Overview (Phase 5)

Integration with WhatsApp Business Cloud API for sending messages to records that have phone numbers.

### 23.2 Configuration

Stored in `tenants.whatsapp_config` (JSONB):

```typescript
{
  enabled: true,
  phone_number_id: "1234567890",
  business_account_id: "0987654321",
  // Access token stored in env var, not in DB
}
```

### 23.3 Send Message Flow

```
1. User clicks "Send WhatsApp" on a record
2. POST /api/whatsapp/send { recordId, templateName, language }
3. Server: Fetches record, gets phone number from data
4. Server: Calls WhatsApp Cloud API with template message
5. Server: Logs activity: "WhatsApp sent to {record_name}"
6. Server: Returns success/failure
```

### 23.4 Incoming Messages (Webhook)

```
POST /api/whatsapp/webhook
  → Receives incoming WhatsApp messages
  → Verifies webhook signature
  → Matches phone number to record
  → Creates chat_message in the record's chat room
  → Triggers notification for assigned user
```

---

## 24. Billing & Subscriptions

### 24.1 Plan Tiers

| Feature | Free | Starter ($9/mo) | Professional ($29/mo) | Enterprise ($99/mo) |
|---|---|---|---|---|
| Records | 500 | 10,000 | 100,000 | Unlimited |
| Users | 3 | 10 | 50 | Unlimited |
| Custom fields | 10 | 25 | 50 | Unlimited |
| Storage | 500 MB | 5 GB | 25 GB | 100 GB |
| Pipeline | No | Yes | Yes | Yes |
| Chat | No | Yes | Yes | Yes |
| Templates | No | 5 | Unlimited | Unlimited |
| WhatsApp | No | No | Yes | Yes |
| Custom roles | No | No | No | Yes |
| API access | No | No | No | Yes |

### 24.2 Stripe Integration

```
Checkout Flow:
  1. Admin clicks "Upgrade" on billing page
  2. POST /api/billing/checkout { plan: "starter" }
  3. Server creates Stripe Checkout Session
  4. Client redirects to Stripe-hosted checkout
  5. User completes payment
  6. Stripe sends webhook to POST /api/billing/webhook
  7. Server updates tenant.plan, tenant.limits, tenant.subscription_status
  8. Server logs billing_event for audit trail

Webhook Events Handled:
  - checkout.session.completed → Activate subscription
  - invoice.paid → Renew subscription
  - invoice.payment_failed → Set status to "past_due"
  - customer.subscription.deleted → Downgrade to free
```

### 24.3 Limit Enforcement

```typescript
// Before creating a record:
if (tenant.usage.record_count >= tenant.limits.max_records && tenant.limits.max_records !== -1) {
  throw new AppError("LIMIT_EXCEEDED", "Record limit reached. Upgrade your plan.");
}

// Before inviting a user:
if (tenant.usage.user_count >= tenant.limits.max_users) {
  throw new AppError("LIMIT_EXCEEDED", "User limit reached. Upgrade your plan.");
}

// Limits checked at the API layer, not the client — always enforced.
```

---

## 25. Validation Layer

### 25.1 Zod Schema Examples

```typescript
// src/validators/record.ts

import { z } from "zod";

export const createRecordSchema = z.object({
  data: z.record(z.string(), z.unknown()),  // Field UUID → value
  pipelineStage: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateRecordSchema = z.object({
  data: z.record(z.string(), z.unknown()).optional(),
  pipelineStage: z.string().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

// src/validators/field.ts

export const createFieldSchema = z.object({
  label: z.string().min(1).max(100),
  type: z.enum(["text", "textarea", "number", "phone", "email", "date",
    "select", "multi_select", "file", "url", "currency", "boolean"]),
  required: z.boolean().optional(),
  sensitive: z.boolean().optional(),
  filterable: z.boolean().optional(),
  searchable: z.boolean().optional(),
  showInTable: z.boolean().optional(),
  config: z.object({}).passthrough().optional(),
});

// src/validators/auth.ts

export const onboardingSchema = z.object({
  companyName: z.string().min(2).max(100),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  theme: z.enum(["dark", "light"]).optional(),
  recordLabel: z.string().max(50).optional(),
  recordLabelSingular: z.string().max(50).optional(),
  documentLabel: z.string().max(50).optional(),
});

// src/validators/invite.ts

export const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "manager", "employee", "viewer"]),
});

export const acceptInviteSchema = z.object({
  inviteId: z.string().uuid(),
});

// src/validators/common.ts

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const filterSchema = z.object({
  match: z.enum(["all", "any"]).default("all"),
  filters: z.array(z.object({
    id: z.string(),
    fieldId: z.string(),
    operator: z.string(),
    value: z.unknown(),
  })).default([]),
});
```

### 25.2 Dynamic Record Validation

```typescript
// Record data is validated against the tenant's field definitions at runtime:

async function validateRecordData(tenantId: string, data: Record<string, unknown>) {
  const tenantFields = await db.select().from(fields).where(eq(fields.tenantId, tenantId));

  for (const field of tenantFields) {
    const value = data[field.id];

    // Check required fields
    if (field.required && (value === undefined || value === null || value === "")) {
      throw new AppError("VALIDATION_ERROR", `${field.label} is required`);
    }

    if (value === undefined || value === null) continue;

    // Type-specific validation
    switch (field.type) {
      case "email":
        if (typeof value !== "string" || !z.string().email().safeParse(value).success) {
          throw new AppError("VALIDATION_ERROR", `${field.label} must be a valid email`);
        }
        break;
      case "number":
      case "currency":
        if (typeof value !== "number") {
          throw new AppError("VALIDATION_ERROR", `${field.label} must be a number`);
        }
        break;
      case "select":
        const options = (field.config as { options: { value: string }[] }).options;
        if (!options.some(o => o.value === value)) {
          throw new AppError("VALIDATION_ERROR", `Invalid option for ${field.label}`);
        }
        break;
      // ... more type checks
    }
  }
}
```

---

## 26. Error Handling Strategy

### 26.1 AppError Class

```typescript
// src/lib/api/errors.ts

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public override message: string,
    public statusCode: number = ERROR_STATUS_MAP[code],
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  LIMIT_EXCEEDED: 403,
  INTERNAL_ERROR: 500,
  USER_NOT_FOUND: 404,
  TENANT_SUSPENDED: 403,
  INVITE_EXPIRED: 410,
  INVITE_INVALID: 404,
};
```

### 26.2 Response Helpers

```typescript
// src/lib/api/response.ts

export function successResponse<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data }, { status });
}

export function paginatedResponse<T>(data: T[], pagination: PaginationMeta): Response {
  return Response.json({ success: true, data, pagination });
}

export function errorResponse(error: AppError): Response {
  return Response.json(
    { success: false, error: { code: error.code, message: error.message, details: error.details } },
    { status: error.statusCode }
  );
}
```

### 26.3 Error Boundaries (React)

```
3 levels of error boundaries:

1. Global (src/app/error.tsx)
   Catches: unhandled errors anywhere in the app
   Shows: "Something went wrong" + retry button

2. Page-level (each page has optional error.tsx)
   Catches: errors within that page
   Shows: Page-specific error message + retry
   Allows: Navigation to other pages still works

3. Component-level (wrapped around risky components)
   Catches: field rendering errors, chart errors
   Shows: Inline error message
   Allows: Rest of the page still works
```

### 26.4 React Query Error Handling

```typescript
// Don't retry auth/permission errors — they won't succeed on retry
retry: (count, error) => {
  if (error instanceof AppError) {
    if (["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "VALIDATION_ERROR"].includes(error.code)) {
      return false;
    }
  }
  return count < 3;  // Retry transient errors up to 3 times
},
```

---

## 27. UI & Design System

### 27.1 Design Tokens

```typescript
// Color system (HSL-based, tenant-customizable)
const colors = {
  primary: "hsl(var(--primary))",           // Default: #7C3AED (purple)
  primaryForeground: "hsl(var(--primary-foreground))",
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",
  muted: "hsl(var(--muted))",
  mutedForeground: "hsl(var(--muted-foreground))",
  border: "hsl(var(--border))",
  destructive: "hsl(var(--destructive))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
};

// Spacing: Tailwind default (4px base)
// Border radius: 0.5rem (rounded-lg default)
// Font: Urbanist (Google Fonts) — all weights
// Dark mode: default, stored in tenant config + user preference
```

### 27.2 Component Library (Shadcn-style)

All UI components are local (not imported from a package). Built with Tailwind CSS + Radix UI primitives:

| Component | Based On | Usage |
|---|---|---|
| Button | Radix Slot | Primary, secondary, destructive, ghost, outline |
| Input | Native | Text, email, number, search, password |
| Select | Radix Select | Single-select dropdown |
| Dialog | Radix Dialog | Modals, confirmation dialogs |
| DropdownMenu | Radix DropdownMenu | Context menus, action menus |
| Table | TanStack Table | Data grid with sort/filter/select |
| Badge | Custom | Status badges, tags |
| Card | Custom | Content containers |
| Skeleton | Custom | Loading placeholders |
| Toast | react-hot-toast | Success/error feedback |
| Tabs | Radix Tabs | Settings page sections |
| Tooltip | Radix Tooltip | Icon button labels |
| Avatar | Custom | User avatars with fallback initials |
| Switch | Radix Switch | Boolean toggles |

### 27.3 Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  TOPBAR                                                  │
│  [☰ Toggle] [Search...        ] [🔔 3] [Avatar ▾]      │
├──────────┬──────────────────────────────────────────────┤
│          │                                               │
│ SIDEBAR  │  CONTENT AREA                                │
│          │                                               │
│ Dashboard│  Page title + actions bar                    │
│ Records  │  ─────────────────────────                   │
│ Pipeline │                                               │
│ Chat     │  Main content                                │
│ Team     │  (table / form / kanban / etc.)              │
│ Activity │                                               │
│ ──────── │                                               │
│ Settings │                                               │
│          │                                               │
└──────────┴──────────────────────────────────────────────┘
```

### 27.4 Loading States

Every data-fetching component shows a skeleton while loading:
- Tables: Skeleton rows (5 rows of gray blocks)
- Cards: Skeleton card with gray blocks
- Detail pages: Skeleton text lines
- Never show empty page while loading — always show skeleton
- Never show spinner for initial page load — skeletons only

---

## 28. Environment Variables

```bash
# ── Database (Neon Serverless Postgres) ──────────────
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/crmwhatstask?sslmode=require

# ── Firebase Auth (client-side — Google OAuth) ───────
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# ── Firebase Admin (server-side — token verification) ─
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# ── Cloudflare R2 (file uploads — S3-compatible) ─────
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=crm-whatstask
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# ── App ──────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://crm.whatstask.com
NEXT_PUBLIC_APP_NAME=CRM WhatsTask

# ── Stripe (Phase 4) ────────────────────────────────
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# ── WhatsApp (Phase 5) ──────────────────────────────
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=
```

---

## 29. Navigation Map

```
PUBLIC ROUTES
────────────────────────
/                      → /login (redirect)
/login                 → Google OAuth
/invite/[token]        → Accept invitation

ONBOARDING
────────────────────────
/onboarding            → 4-step workspace setup

PLATFORM (auth required)
────────────────────────
/dashboard             → Stats + recent activity
/records               → Record table + CRUD + filters
/records/[id]          → Record detail + edit
/pipeline              → Kanban board
/chat                  → Messaging
/employees             → Team management
/activity              → Audit log viewer
/templates             → Document templates

/settings/general      → Company name, labels
/settings/fields       → Custom field builder
/settings/branding     → Logo, colors, theme
/settings/roles        → Custom roles (Pro+)
/settings/billing      → Subscription management

SUPER ADMIN
────────────────────────
/super-admin/tenants
/super-admin/subscriptions
/super-admin/analytics
```

---

## 30. Feature Status & Roadmap

| Feature | Status | Phase |
|---|---|---|
| Next.js 15 project + Tailwind + TypeScript | 🔴 Must build | Phase 1 |
| Neon Postgres + Drizzle ORM + full schema migration | 🔴 Must build | Phase 1 |
| Firebase Auth (Google OAuth) + Admin SDK | 🔴 Must build | Phase 1 |
| withAuth() + withValidation() middleware | 🔴 Must build | Phase 1 |
| AppError class + API response helpers | 🔴 Must build | Phase 1 |
| AuthProvider + login page + token refresh | 🔴 Must build | Phase 1 |
| Onboarding wizard (4 steps + transaction) | 🔴 Must build | Phase 2 |
| Sidebar + topbar + shell layout | 🔴 Must build | Phase 2 |
| RBAC permission system + `<Can>` component | 🔴 Must build | Phase 2 |
| Custom field CRUD + field editor UI | 🔴 Must build | Phase 3 |
| Record CRUD (create, read, update, soft-delete) | 🔴 Must build | Phase 3 |
| Server-side query engine (filter → SQL) | 🔴 Must build | Phase 3 |
| Record table + server-side pagination | 🔴 Must build | Phase 3 |
| Filter builder UI | 🔴 Must build | Phase 3 |
| Full-text search (tsvector) | 🔴 Must build | Phase 3 |
| Record detail page | 🔴 Must build | Phase 3 |
| Dynamic field renderer (all 12 types) | 🔴 Must build | Phase 3 |
| Invite flow (create, link, accept) | 🔴 Must build | Phase 4 |
| Team management (list, roles, remove) | 🔴 Must build | Phase 4 |
| Audit logging on all mutations | 🔴 Must build | Phase 4 |
| Activity log viewer page | 🔴 Must build | Phase 4 |
| Dashboard with SQL aggregations | 🔴 Must build | Phase 5 |
| Saved views (server-persisted) | 🔴 Must build | Phase 5 |
| Record export (CSV) | 🔴 Must build | Phase 5 |
| Pipeline / Kanban board | 🔴 Must build | Phase 5 |
| Record assignment + "My Records" | 🔴 Must build | Phase 5 |
| File upload (Cloudflare R2 + presigned URLs) | 🔴 Must build | Phase 6 |
| Document templates + PDF generation | 🔴 Must build | Phase 6 |
| Chat system + SSE real-time | 🔴 Must build | Phase 6 |
| Notification system + SSE | 🔴 Must build | Phase 6 |
| @mention support in chat | 🔴 Must build | Phase 6 |
| Dark/light theme + tenant branding | 🔴 Must build | Phase 7 |
| Skeleton loading states everywhere | 🔴 Must build | Phase 7 |
| Error boundaries (3 levels) | 🔴 Must build | Phase 7 |
| Mobile responsive layout | 🔴 Must build | Phase 7 |
| Settings pages (general, branding, fields, billing) | 🔴 Must build | Phase 7 |
| Production deploy (Vercel + Neon + R2) | 🔴 Must build | Phase 7 |
| End-to-end testing + bug fixes | 🔴 Must build | Phase 7 |
| Stripe billing + plan enforcement | 🔲 Post-launch | Post-launch |
| WhatsApp integration | 🔲 Post-launch | Post-launch |
| Super-admin dashboard | 🔲 Post-launch | Post-launch |
| Custom role editor | 🔲 Post-launch | Post-launch |

---

## 31. Implementation Phases

> **Goal**: Deliver a complete, production-ready CRM to the first client.
> Multi-tenant architecture is built from day 1 (`tenant_id` on every table, isolation enforced at every layer).
> Every phase produces working, testable functionality — no throwaway code.

---

### Phase 1 — Project Foundation
**Goal**: Bootable app with auth, database, and API infrastructure. Nothing visible to end users yet — this is pure plumbing.

```
PROJECT SETUP
  [ ] Initialize Next.js 15 with TypeScript strict mode
  [ ] Configure Tailwind CSS 4 + Shadcn-style base components
  [ ] Configure ESLint + Prettier
  [ ] Set up path aliases (@/components, @/lib, @/db, etc.)
  [ ] Create folder structure per architecture (src/app, components, db, lib, hooks, stores, validators, types)
  [ ] Install all Phase 1 dependencies:
      - @neondatabase/serverless, drizzle-orm, drizzle-kit
      - firebase, firebase-admin
      - zod
      - @tanstack/react-query
      - zustand
      - lucide-react, date-fns

DATABASE
  [ ] Create Neon project + database
  [ ] Set up src/db/index.ts (Neon + Drizzle connection)
  [ ] Write complete Drizzle schema (src/db/schema.ts) — all 12 tables
  [ ] Configure drizzle-kit for migrations
  [ ] Run first migration — create all tables, indexes, triggers, functions
  [ ] Verify schema in Neon console

FIREBASE AUTH
  [ ] Set up Firebase project (if not already)
  [ ] Enable Google OAuth provider in Firebase console
  [ ] Create src/lib/firebase/client.ts — Firebase client SDK init
  [ ] Create src/lib/firebase/admin.ts — Firebase Admin SDK init (server-only)
  [ ] Add all Firebase env vars to .env.local

API INFRASTRUCTURE
  [ ] Create src/types/ — all TypeScript types from Section 6:
      - permissions.ts (UserRole, PermissionKey, UserPermissions, ROLE_PERMISSIONS)
      - auth.ts (AuthContext, AuthStatus, AuthState)
      - fields.ts (FieldType, FieldConfig discriminated union, SelectOption)
      - filters.ts (FilterOperator, Filter, FilterGroup, SortConfig, PaginationParams)
      - api.ts (ApiResponse, PaginationMeta, ErrorCode)
      - database.ts (all InferSelectModel/InferInsertModel types)
      - index.ts (re-export all)
  [ ] Create src/lib/api/errors.ts — AppError class + ERROR_STATUS_MAP
  [ ] Create src/lib/api/response.ts — successResponse(), paginatedResponse(), errorResponse()
  [ ] Create src/lib/api/middleware.ts — withAuth() implementation:
      - Extract Bearer token from Authorization header
      - Firebase Admin verifyIdToken(token)
      - SELECT user FROM users WHERE firebase_uid = decoded.uid
      - Build AuthContext from user row
      - Permission check (optional second arg)
      - Return 401/403/404 with proper AppError
  [ ] Create src/lib/api/middleware.ts — withValidation() implementation:
      - Parse request body as JSON
      - Validate against Zod schema
      - Return 400 with validation errors if fails
      - Pass validated body to handler
  [ ] Create src/lib/permissions.ts — ROLE_PERMISSIONS map + hasPermission helper
  [ ] Create POST /api/auth route:
      - Verify Firebase token
      - Look up user in Postgres
      - Return { user, tenant } or 404 USER_NOT_FOUND
  [ ] Test auth flow end-to-end with curl/Postman

AUTH UI
  [ ] Create src/components/providers/query-provider.tsx — React Query client config
  [ ] Create src/components/providers/auth-provider.tsx — AuthProvider:
      - Firebase onAuthStateChanged listener
      - POST /api/auth with token
      - Auth state machine (idle → loading → authenticated/new_user/error)
      - AbortController for cleanup
      - Retry mechanism
      - signOut clears React Query + Zustand
  [ ] Create src/components/providers/app-providers.tsx — compose all providers
  [ ] Create src/app/(auth)/layout.tsx — centered card layout
  [ ] Create src/app/(auth)/login/page.tsx — Google OAuth login button
  [ ] Create src/app/layout.tsx — root layout with providers + Urbanist font
  [ ] Create src/app/page.tsx — redirect to /login
  [ ] Verify: can sign in with Google, token verified, 404 returned (no user yet)

RESULT: App boots, user can sign in with Google, API infrastructure works,
        database has all tables. No features yet — just the foundation.
```

---

### Phase 2 — App Shell + Onboarding + RBAC
**Goal**: User can sign in, create a workspace, and see the app shell. RBAC is enforced from day 1.

```
ONBOARDING
  [ ] Create src/validators/auth.ts — onboardingSchema (Zod)
  [ ] Create POST /api/onboarding route:
      - Verify Firebase token (no withAuth — user doesn't exist yet)
      - Validate body with onboardingSchema
      - Transaction: create tenant → create admin user → create 5 default fields
      - Return { user, tenant }
  [ ] Create src/app/onboarding/page.tsx — 4-step wizard:
      Step 1: Company name, industry, size
      Step 2: Logo upload (skip for now, just color picker), primary color, theme
      Step 3: Record label, record label singular, document label
      Step 4: Review all choices + "Create Workspace" button
  [ ] Update AuthProvider: when status = "new_user", redirect to /onboarding
  [ ] Update AuthProvider: after onboarding completes, refetch /api/auth → authenticated
  [ ] Verify: full flow — sign in → onboarding → workspace created in Postgres

RBAC
  [ ] Create src/components/providers/permission-provider.tsx:
      - PermissionContext from AuthContext.permissions
      - usePermission(key) hook — returns boolean
  [ ] Create src/components/guards/can.tsx — <Can permission="records.delete">
  [ ] Create src/components/guards/auth-guard.tsx — redirect to /login if not auth'd
  [ ] Create src/components/guards/role-guard.tsx — redirect if role too low

APP SHELL
  [ ] Create base UI components (src/components/ui/):
      - button.tsx (primary, secondary, destructive, ghost, outline variants)
      - input.tsx (text, email, number, search)
      - dialog.tsx (modal wrapper)
      - dropdown-menu.tsx (action menus)
      - badge.tsx (status badges)
      - card.tsx (content containers)
      - skeleton.tsx (loading placeholders)
      - avatar.tsx (user avatar with initials fallback)
      - select.tsx (dropdown select)
      - switch.tsx (toggle)
      - tabs.tsx (tab navigation)
      - tooltip.tsx (hover labels)
  [ ] Create src/components/layout/sidebar.tsx:
      - Navigation items: Dashboard, Records, Pipeline, Chat, Team, Activity, Templates
      - Settings section at bottom
      - Collapsible (mobile: overlay, desktop: rail)
      - Active route highlighting
      - Tenant logo + name at top
  [ ] Create src/components/layout/topbar.tsx:
      - Sidebar toggle button
      - Search input (placeholder for now)
      - Notification bell (placeholder count)
      - User avatar dropdown (profile info, sign out)
  [ ] Create src/components/layout/shell.tsx — sidebar + topbar + content slot
  [ ] Create src/app/(platform)/layout.tsx — AuthGuard + Shell wrapper
  [ ] Create src/app/(platform)/dashboard/page.tsx — placeholder "Welcome to {tenant.name}"
  [ ] Create all other page.tsx files as empty placeholders:
      - records, records/[id], pipeline, chat, employees, activity, templates
      - settings/general, settings/fields, settings/branding, settings/billing
  [ ] Verify: sign in → onboarding → see app shell with sidebar navigation

ZUSTAND STORES
  [ ] Create src/stores/ui-store.ts:
      - sidebarCollapsed: boolean
      - activeModal: string | null
      - theme: "dark" | "light"
  [ ] Create src/stores/filter-store.ts:
      - filters: FilterGroup
      - sort: SortConfig[]
      - search: string
      - page: number, pageSize: number
      - setFilters(), setSort(), setSearch(), setPage(), reset()
  [ ] Create src/stores/selection-store.ts:
      - selectedIds: Set<string>
      - toggleSelection(), selectAll(), clearSelection()

RESULT: Complete app shell with sidebar, topbar, routing. User can sign in,
        create workspace, navigate all pages. RBAC enforced. Zustand stores ready.
```

---

### Phase 3 — Records + Fields + Query Engine (Core CRM)
**Goal**: The meat of the CRM — create, view, edit, filter, search, paginate records with custom fields.

```
CUSTOM FIELDS API
  [ ] Create src/validators/field.ts — createFieldSchema, updateFieldSchema
  [ ] Create GET /api/fields — list fields for tenant (sorted by field_order)
  [ ] Create POST /api/fields — create field (permission: settings.edit_fields)
      - Auto-assign field_order (max + 1)
      - Validate config against field type (e.g. select must have options)
  [ ] Create PUT /api/fields — update field (permission: settings.edit_fields)
  [ ] Create DELETE /api/fields — delete field (permission: settings.edit_fields)
      - Check: no records use this field? Or just mark it hidden?
      - Decision: soft-hide — remove from UI, keep data in JSONB
  [ ] Create PUT /api/fields/reorder — bulk reorder (permission: settings.edit_fields)
  [ ] Create src/hooks/queries/use-fields.ts — React Query hook:
      - useFields() — GET /api/fields
      - useCreateField(), useUpdateField(), useDeleteField() mutations
      - Invalidate on mutation success

FIELD EDITOR UI
  [ ] Create src/app/(platform)/settings/fields/page.tsx:
      - List all fields with drag-to-reorder
      - Each field shows: label, type, required badge, filterable, show_in_table
      - "Add Field" button
      - Click field → edit modal
  [ ] Create src/components/fields/field-editor.tsx — create/edit field modal:
      - Field label input
      - Field type picker (12 types with icons)
      - Type-specific config (e.g. options editor for select/multi_select)
      - Required toggle, sensitive toggle, filterable toggle, show_in_table toggle
      - Save / Cancel buttons
  [ ] Create src/components/fields/field-type-picker.tsx — grid of 12 types with icons

RECORDS API
  [ ] Create src/validators/record.ts — createRecordSchema, updateRecordSchema
  [ ] Create src/lib/api/query-builder.ts — buildRecordQuery():
      - Takes: tenantId, filters, sort, search, page, pageSize
      - Builds SQL WHERE from FilterGroup (all 20+ operators)
      - Full-text search via search_vector @@ plainto_tsquery()
      - Sort by dynamic field or built-in column
      - Offset-based pagination
      - Returns: { data: Record[], total: number }
  [ ] Create GET /api/records — list records (permission: records.read)
      - Parse query params: filters (JSON), sort (JSON), search, page, pageSize
      - Validate with paginationSchema + filterSchema
      - Call buildRecordQuery()
      - Strip sensitive fields if user lacks records.view_sensitive
      - Return paginated response
  [ ] Create POST /api/records — create record (permission: records.create)
      - Validate data against tenant field definitions (dynamic validation)
      - Check plan limits (record count)
      - INSERT into records
      - Return created record
  [ ] Create GET /api/records/[id] — get single record (permission: records.read)
      - Verify record belongs to tenant
      - Strip sensitive fields
  [ ] Create PUT /api/records/[id] — update record (permission: records.update)
      - Verify record belongs to tenant
      - Validate changed data against field definitions
      - Increment version
      - UPDATE record
  [ ] Create DELETE /api/records/[id] — soft-delete (permission: records.delete)
      - SET deleted = true, deleted_at = now(), deleted_by = ctx.uid
  [ ] Create POST /api/records/bulk — bulk operations (permission: records.bulk_actions)
      - Actions: bulk_delete, bulk_update (change one field for multiple records)
      - Validate all record IDs belong to tenant

RECORDS UI — TABLE
  [ ] Create src/hooks/queries/use-records.ts — React Query hook:
      - useRecords(filters, sort, search, page, pageSize) — GET /api/records
      - Uses keepPreviousData: true for smooth pagination
      - useCreateRecord(), useUpdateRecord(), useDeleteRecord() mutations
  [ ] Create src/components/records/record-table.tsx — TanStack Table:
      - Columns auto-generated from field definitions (showInTable = true)
      - Server-side sorting (click column header → update sort store → refetch)
      - Server-side pagination (page controls → update page store → refetch)
      - Row selection via checkboxes (uses selection-store)
      - Bulk action bar (appears when rows selected)
      - "New Record" button
      - Empty state when no records
      - Loading skeleton while fetching
  [ ] Create src/components/records/field-renderer.tsx — renders value by field type:
      - text/textarea: plain text
      - number: formatted number
      - phone: clickable tel: link
      - email: clickable mailto: link
      - date: formatted with date-fns
      - select: colored badge
      - multi_select: multiple badges
      - file: file icon + link (placeholder)
      - url: clickable link
      - currency: formatted with currency symbol
      - boolean: check/x icon
  [ ] Create src/app/(platform)/records/page.tsx — record list page:
      - Page title (uses tenant.recordLabel)
      - Search bar (debounced, updates search store → refetch)
      - Filter builder toggle
      - Record table
      - "New Record" button → opens record form dialog

FILTER BUILDER
  [ ] Create src/components/records/filter-builder.tsx:
      - "Add filter" button
      - Each filter row: field selector → operator selector → value input
      - Operator options change based on field type:
        text: is, is_not, contains, starts_with, ends_with, is_empty, is_not_empty
        number: eq, gt, gte, lt, lte, between
        date: is_before, is_after, is_today, is_this_week, is_this_month
        select: is, is_not, is_any_of, is_none_of
        boolean: is_true, is_false
      - Match toggle: "all" (AND) / "any" (OR)
      - Remove filter (x button per row)
      - Clear all filters
      - Changes update filter-store → triggers React Query refetch

RECORD FORM
  [ ] Create src/components/records/record-form.tsx — dynamic form:
      - Renders form fields based on tenant field definitions
      - Each field type → appropriate input component:
        text → Input, textarea → Textarea, number → NumberInput
        phone → Input(type=tel), email → Input(type=email)
        date → DatePicker, select → Select, multi_select → MultiSelect
        file → placeholder "Coming soon", url → Input(type=url)
        currency → CurrencyInput, boolean → Switch
      - Required field validation (client-side before submit)
      - Submit → POST /api/records (create) or PUT /api/records/[id] (update)
      - Can be used as dialog (for create from table) or full page (detail view)

RECORD DETAIL PAGE
  [ ] Create src/app/(platform)/records/[id]/page.tsx:
      - Fetch single record via GET /api/records/[id]
      - Display all fields using field-renderer (view mode)
      - "Edit" button → switches to record-form (edit mode)
      - "Delete" button (with confirm dialog) → soft-delete
      - Back button → return to record list
      - Skeleton loading state
      - 404 handling if record doesn't exist

SEARCH
  [ ] Wire up topbar search to filter-store.search
  [ ] Debounce search input (300ms)
  [ ] Search query sent to GET /api/records as search param
  [ ] Server: search_vector @@ plainto_tsquery('english', search)
  [ ] Clear search button (x in search input)

RESULT: Full CRM functionality — create records, view in table, filter, search,
        sort, paginate, view detail, edit, delete. Custom field builder works.
        This is the core product.
```

---

### Phase 4 — Team Management + Audit Logging
**Goal**: Multiple users can work in the same workspace. Every action is tracked.

```
INVITE FLOW
  [ ] Create src/validators/invite.ts — createInviteSchema, acceptInviteSchema
  [ ] Create POST /api/invites — create invite (permission: team.invite):
      - Validate email + role
      - Check: user not already in tenant
      - Check: no pending invite for same email
      - Check: user limit not exceeded
      - INSERT invite (status: pending, expires: 7 days)
      - Return invite with link URL
  [ ] Create GET /api/invites?id={id} — validate invite (public, no auth):
      - Return invite details (tenant name, role, status, expired?)
      - Don't return sensitive data
  [ ] Create POST /api/invites/accept — accept invite (token auth only):
      - Verify invite exists, is pending, not expired
      - Create user row with invite's role + ROLE_PERMISSIONS[role]
      - Update invite: status = "accepted", accepted_by, accepted_at
      - Update tenant usage: user_count + 1
      - Return { user, tenant }
  [ ] Create src/app/(auth)/invite/[token]/page.tsx — invite acceptance page:
      - Fetch invite details (GET /api/invites?id=token)
      - Show: "You've been invited to {tenant_name} as {role}"
      - If not signed in: "Sign in with Google to accept"
      - If signed in: "Accept Invitation" button → POST /api/invites/accept
      - Handle expired/invalid invite states
  [ ] Update AuthProvider: check for pending invite after sign-in

TEAM MANAGEMENT
  [ ] Create GET /api/users — list team members (permission: team.invite):
      - Return all users in tenant (id, name, email, role, status, lastActive)
  [ ] Create PUT /api/users/[id] — change role (permission: team.change_role):
      - Cannot change own role
      - Cannot demote last admin
      - Update user.role + user.permissions (from ROLE_PERMISSIONS)
  [ ] Create DELETE /api/users/[id] — remove user (permission: team.remove):
      - Cannot remove self
      - Cannot remove last admin
      - Set user.status = "suspended"
      - Update tenant usage: user_count - 1
  [ ] Create src/hooks/queries/use-users.ts — React Query hooks
  [ ] Create src/app/(platform)/employees/page.tsx — team management page:
      - User table: name, email, role, status, last active
      - "Invite" button → modal: email input + role selector
      - Role change dropdown (inline in table)
      - Remove button (with confirm dialog)
      - Pending invites section (with resend/revoke)
      - <Can permission="team.invite"> guards on invite button
      - <Can permission="team.change_role"> guards on role dropdown
      - <Can permission="team.remove"> guards on remove button

AUDIT LOGGING
  [ ] Create audit logging helper function:
      async function logActivity(ctx: AuthContext, action: string, entityType: string,
        entityId?: string, entityName?: string, changes?: object, snapshot?: object)
  [ ] Add logActivity() calls to ALL mutation endpoints:
      - POST /api/records → "record.created"
      - PUT /api/records/[id] → "record.updated" (with field-level diff)
      - DELETE /api/records/[id] → "record.deleted"
      - POST /api/records/bulk → "record.bulk_deleted" / "record.bulk_updated"
      - POST /api/fields → "field.created"
      - PUT /api/fields → "field.updated"
      - DELETE /api/fields → "field.deleted"
      - POST /api/invites → "user.invited"
      - POST /api/invites/accept → "user.accepted_invite"
      - PUT /api/users/[id] → "user.role_changed"
      - DELETE /api/users/[id] → "user.removed"
      - PUT /api/tenants → "tenant.updated"
  [ ] Create GET /api/audit — query audit logs (permission: team.view_activity):
      - Filter by: action, entityType, userId, date range
      - Paginated, sorted by created_at DESC
  [ ] Create src/hooks/queries/use-audit.ts — React Query hook
  [ ] Create src/app/(platform)/activity/page.tsx — activity log viewer:
      - Timeline view of all activity
      - Each entry: avatar, user name, action description, timestamp
      - Click entry → link to affected record/user
      - Filter by action type, user, date range
      - Paginated (load more / infinite scroll)

RESULT: Multiple users with different roles, invite flow, team management.
        Every action in the system is tracked with full audit trail.
```

---

### Phase 5 — Dashboard + Pipeline + Views + Export
**Goal**: Visual management tools — dashboard stats, kanban pipeline, saved views, CSV export.

```
DASHBOARD
  [ ] Create GET /api/dashboard — aggregate stats (permission: records.read):
      - Total records (active)
      - Records created this week / this month
      - Records by pipeline stage (for pie/bar chart)
      - Records by status field (top select field values)
      - Recent activity (last 10 entries)
      - Team member count
  [ ] Create src/hooks/queries/use-dashboard.ts — React Query hook
  [ ] Create src/app/(platform)/dashboard/page.tsx — dashboard:
      - Stat cards: total records, this week, this month, team size
      - Pipeline breakdown chart (bar or pie — using a lightweight chart lib)
      - Recent activity feed (last 10 audit entries with links)
      - Quick actions: "New Record", "Invite Team Member"
      - Skeleton loading state for all cards

PIPELINE / KANBAN
  [ ] Create GET /api/pipeline — get pipeline config from tenant
  [ ] Create PUT /api/pipeline — update pipeline config (permission: settings.edit_pipeline):
      - Update tenant.pipeline_config (stages array)
  [ ] Create src/app/(platform)/pipeline/page.tsx — kanban board:
      - Columns = pipeline stages (from tenant config)
      - Cards = records in each stage
      - Drag-and-drop between columns (updates record.pipeline_stage)
      - Card shows: first 3 fields + assigned user avatar
      - Column header: stage name + record count
      - "Configure stages" button (admin only → settings modal)
      - Empty column state: "No records in this stage"
  [ ] Create pipeline stage editor (modal or settings page):
      - Add/remove/rename stages
      - Set stage color
      - Drag to reorder stages
  [ ] Record assignment:
      - Add "Assigned To" dropdown to record form (select from team members)
      - PUT /api/records/[id] { assignedTo: userId }
      - Filter: "My Records" (assigned_to = current user)
      - Pipeline cards show assigned user avatar

SAVED VIEWS
  [ ] Create src/validators/view.ts — createViewSchema, updateViewSchema
  [ ] Create GET /api/views — list saved views for tenant
  [ ] Create POST /api/views — save current filters/sort as named view
  [ ] Create PUT /api/views — update saved view
  [ ] Create DELETE /api/views — delete saved view
  [ ] Add saved views to records page:
      - Dropdown/tab bar above table: "All Records" + saved views
      - Click view → load its filters + sort into stores → refetch
      - "Save current view" button → name input → save
      - Pin/unpin views
      - Share view toggle (visible to all team members vs. personal)

RECORD EXPORT
  [ ] Create POST /api/export — export records (permission: records.export):
      - Apply current filters (same as GET /api/records but no pagination limit)
      - Max 10,000 records per export
      - Generate CSV with field labels as headers
      - Return CSV as downloadable response
  [ ] Add "Export" button to records page (respects current filters)

TENANT SETTINGS
  [ ] Create GET /api/tenants — get tenant settings
  [ ] Create PUT /api/tenants — update settings (permission: settings.edit_branding)
  [ ] Create src/app/(platform)/settings/general/page.tsx:
      - Company name
      - Record label / singular
      - Document label
      - Save button

RESULT: Dashboard with stats, pipeline kanban with drag-and-drop, saved views,
        CSV export. The CRM now has visual management tools.
```

---

### Phase 6 — Chat + Notifications + File Upload + Templates
**Goal**: Team collaboration (chat, notifications) + file handling + document generation.

```
FILE UPLOAD (CLOUDFLARE R2)
  [ ] Set up Cloudflare R2 bucket (free tier)
  [ ] Install @aws-sdk/client-s3, @aws-sdk/s3-request-presigner
  [ ] Create POST /api/upload/presign — generate presigned upload URL:
      - Verify auth + permission
      - Validate file type, size against field config
      - Check storage limit
      - Generate presigned PUT URL (5 min expiry)
      - Return { uploadUrl, publicUrl }
  [ ] Create file upload component:
      - react-dropzone for drag-and-drop
      - Progress bar during upload
      - File preview (image thumbnail / file icon)
      - Delete button (removes from R2 + updates record)
  [ ] Wire file field type in record-form:
      - Upload to R2 via presigned URL
      - Save publicUrl in record data JSONB
  [ ] Wire file field type in field-renderer:
      - Show file name + download link
      - Image fields: show thumbnail

CHAT SYSTEM
  [ ] Create GET /api/chat — list chat rooms for user (filtered by participants)
  [ ] Create POST /api/chat — send message (permission: chat.send):
      - Validate content (non-empty, max 5000 chars)
      - INSERT into chat_messages
      - UPDATE chat_rooms.last_message_at
      - Create notifications for other participants
  [ ] Create GET /api/chat/sse — SSE stream for real-time messages:
      - Poll chat_messages every 2s for messages newer than last sent
      - Stream new messages to connected client
  [ ] Create src/hooks/use-sse.ts — SSE connection hook with auto-reconnect
  [ ] Create src/app/(platform)/chat/page.tsx — chat interface:
      - Left panel: room list (sorted by last_message_at)
      - Right panel: message thread
      - Room types: Team (auto-created), Record rooms, Direct messages
      - Message input with send button
      - Message bubbles: sender name, content, timestamp
      - Auto-scroll to bottom on new message
      - Unread indicator on rooms
  [ ] @mention support:
      - Type @ → show user picker dropdown
      - Parse @mentions from content
      - Create notification for mentioned users
  [ ] Record chat:
      - Add "Chat" tab to record detail page
      - Auto-creates room on first message (type: "record")

NOTIFICATION SYSTEM
  [ ] Create GET /api/notifications — list notifications for user (paginated)
  [ ] Create PUT /api/notifications — mark as read (batch)
  [ ] Create GET /api/notifications/sse — SSE stream for real-time notifications
  [ ] Create notification creation helper:
      async function createNotification(tenantId, userId, type, title, body?, link?)
  [ ] Wire notifications into existing features:
      - Record assigned → notify assigned user
      - Chat message → notify room participants
      - @mention → notify mentioned user
      - Invite accepted → notify inviter
      - Role changed → notify affected user
  [ ] Create notification UI:
      - Bell icon in topbar with unread count badge
      - Dropdown panel: list of notifications
      - Click notification → navigate to link
      - "Mark all as read" button
      - SSE stream updates badge + shows toast for new notifications

DOCUMENT TEMPLATES + PDF
  [ ] Create src/validators/template.ts — Zod schemas
  [ ] Create GET /api/templates — list templates
  [ ] Create POST /api/templates — create template (permission: settings.edit_templates)
  [ ] Create PUT /api/templates — update template
  [ ] Create DELETE /api/templates — delete template
  [ ] Create src/app/(platform)/templates/page.tsx:
      - Template list (name, description, created by)
      - "Create Template" button → template editor
  [ ] Template editor:
      - Rich text area for HTML content
      - {{placeholder}} insertion via field picker
      - Live preview with sample data
      - Field mapping configuration
  [ ] PDF generation:
      - "Generate PDF" button on record detail page
      - Select template → replace placeholders with record data
      - Render via @react-pdf/renderer
      - Download PDF file
      - All client-side — no server cost

RESULT: Team can chat in real-time, get notifications, upload files,
        and generate PDF documents from templates. Full collaboration suite.
```

---

### Phase 7 — Polish + Branding + Production Deploy
**Goal**: Production-ready. Polished UI, responsive, error-proof, deployed.

```
THEMING + BRANDING
  [ ] Create dark/light theme system:
      - CSS variables for all colors (HSL-based)
      - Theme toggle in topbar user menu
      - Persist preference in Zustand + localStorage
      - Respect tenant.theme as default
  [ ] Create src/app/(platform)/settings/branding/page.tsx:
      - Logo upload (Cloudflare R2)
      - Primary color picker (updates CSS variables)
      - Theme default (dark/light)
      - Preview panel showing how it looks
  [ ] Apply tenant branding everywhere:
      - Sidebar logo
      - Login page logo
      - Topbar accent color
      - PDF templates use tenant branding

LOADING STATES + ERROR HANDLING
  [ ] Add skeleton loading to every page:
      - Dashboard: stat card skeletons + activity feed skeleton
      - Records: table row skeletons
      - Record detail: field line skeletons
      - Pipeline: column skeletons with card placeholders
      - Chat: message bubble skeletons
      - Team: user row skeletons
  [ ] Create error boundaries:
      - src/app/error.tsx — global error boundary
      - src/app/(platform)/records/error.tsx — record page error
      - Component-level boundaries for charts, chat, etc.
      - Each shows: error message + "Try Again" button
  [ ] Add react-hot-toast for all mutations:
      - Success: "Record created", "Field saved", "Invite sent"
      - Error: error.message from API response
  [ ] 404 page (src/app/not-found.tsx)
  [ ] Empty states for all lists:
      - No records → "Create your first record"
      - No team members → "Invite your first team member"
      - No fields → "Add your first custom field"
      - No templates → "Create your first template"

MOBILE RESPONSIVE
  [ ] Sidebar: overlay mode on mobile (hamburger toggle)
  [ ] Record table: horizontal scroll on small screens
  [ ] Record form: full-width fields on mobile
  [ ] Pipeline: horizontal scroll for columns
  [ ] Chat: full-screen room view on mobile
  [ ] Filter builder: stacked layout on mobile
  [ ] All dialogs: full-screen on mobile

SETTINGS PAGES
  [ ] Settings/general — company name, labels (already built in Phase 5)
  [ ] Settings/fields — field builder (already built in Phase 3)
  [ ] Settings/branding — logo, color, theme (built above)
  [ ] Settings/billing — placeholder page:
      - Current plan: "Free"
      - Usage stats (records, users, storage)
      - "Upgrade" button (disabled — Stripe integration is post-launch)

PRODUCTION DEPLOY
  [ ] Create .env.example with all required variables documented
  [ ] Create .gitignore (node_modules, .env.local, .next, etc.)
  [ ] Set up Vercel project:
      - Connect GitHub repository
      - Add all environment variables
      - Configure production domain (crm.whatstask.com)
  [ ] Set up Neon production database:
      - Run migrations
      - Verify all tables, indexes, triggers
  [ ] Set up Cloudflare R2 production bucket:
      - Configure CORS for production domain
      - Set up public URL
  [ ] End-to-end testing checklist:
      [ ] Sign in with Google → onboarding → dashboard
      [ ] Create custom fields → create records → view in table
      [ ] Filter records → search records → sort records → paginate
      [ ] Edit record → delete record → bulk delete
      [ ] View record detail → edit inline → generate PDF
      [ ] Invite team member → accept invite → see shared workspace
      [ ] Change role → verify permission changes
      [ ] Pipeline: drag records between stages
      [ ] Chat: send message → receive in real-time
      [ ] Notifications: verify all notification types appear
      [ ] File upload: upload → view → download → delete
      [ ] Export records to CSV
      [ ] Settings: change branding, labels, fields
      [ ] Activity log: verify all actions logged
      [ ] Dark/light theme toggle
      [ ] Mobile: test all pages on phone-size viewport
  [ ] Bug fixes from testing
  [ ] Performance check: verify table loads < 500ms with 100+ records

RESULT: Production-ready CRM. Fully polished, responsive, error-handled,
        deployed, tested. Ready to hand to client.
```

---

### Post-Launch — Revenue + Advanced Features
**Goal**: Scale the business after first client is live.

```
BILLING (when ready to onboard tenant #2+)
  [ ] Stripe integration (Checkout + webhooks)
  [ ] Plan tiers with limit enforcement
  [ ] Billing settings page with plan management
  [ ] Upgrade/downgrade flow

WHATSAPP (when client requests it)
  [ ] WhatsApp Business Cloud API integration
  [ ] Send template messages to records
  [ ] Receive incoming messages as chat

SUPER ADMIN (when managing 3+ tenants)
  [ ] Super-admin dashboard (/super-admin)
  [ ] Tenant management (view all tenants, usage, plans)
  [ ] Revenue analytics

OTHER
  [ ] Custom role editor (enterprise feature)
  [ ] API access for Pro+ plans
  [ ] Email notifications (SendGrid/Resend integration)
```

---

*This architecture document is the single source of truth for CRM WhatsTask.
All implementation must align with the patterns defined here.
No section references external documents — everything is self-contained.
Multi-tenant from day 1: tenant_id on every table, isolation at every layer.
Stack: Next.js 15 + PostgreSQL 16 (Neon) + Firebase Auth + Cloudflare R2 + Drizzle ORM.*
