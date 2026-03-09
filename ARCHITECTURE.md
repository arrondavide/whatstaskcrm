# CRM WhatsTask — System Architecture & Design (v2)

> **Version**: 2.0 — Industry-standard, production-hardened architecture
> **Last Updated**: 2026-03-09
> **Production URL**: `https://crm.whatstask.com`

---

## Table of Contents

1. [Project Overview & Tech Stack](#1-project-overview--tech-stack)
2. [Architecture Principles](#2-architecture-principles)
3. [Folder Structure](#3-folder-structure)
4. [Security Architecture](#4-security-architecture)
5. [Authentication & Session Management](#5-authentication--session-management)
6. [API Layer — Middleware & Routes](#6-api-layer--middleware--routes)
7. [Multi-Tenant Data Model](#7-multi-tenant-data-model)
8. [State Management Architecture](#8-state-management-architecture)
9. [Role-Based Access Control (RBAC)](#9-role-based-access-control-rbac)
10. [Custom Field System](#10-custom-field-system)
11. [Filter & Search Engine](#11-filter--search-engine)
12. [Real-Time Data Sync](#12-real-time-data-sync)
13. [Invite & Team Management](#13-invite--team-management)
14. [Onboarding Flow](#14-onboarding-flow)
15. [File Storage & Upload](#15-file-storage--upload)
16. [Audit Logging System](#16-audit-logging-system)
17. [Pipeline / Kanban Board](#17-pipeline--kanban-board)
18. [Chat & Messaging](#18-chat--messaging)
19. [Document Templates & PDF Generation](#19-document-templates--pdf-generation)
20. [WhatsApp Integration](#20-whatsapp-integration)
21. [Billing & Subscriptions](#21-billing--subscriptions)
22. [Notification System](#22-notification-system)
23. [Validation Layer](#23-validation-layer)
24. [Error Handling Strategy](#24-error-handling-strategy)
25. [UI & Design System](#25-ui--design-system)
26. [Firestore Security Rules](#26-firestore-security-rules)
27. [Firestore Indexes](#27-firestore-indexes)
28. [Environment Variables](#28-environment-variables)
29. [Deployment & Infrastructure](#29-deployment--infrastructure)
30. [Navigation Map](#30-navigation-map)
31. [Feature Status & Roadmap](#31-feature-status--roadmap)
32. [Implementation Phases](#32-implementation-phases)

---

## 1. Project Overview & Tech Stack

**CRM WhatsTask** is a multi-tenant, white-label CRM SaaS platform built for service businesses (manpower agencies, real estate, sales teams, HR departments). Each tenant gets a fully branded workspace with customizable records, team management, audit logging, pipeline management, integrated messaging, and document templating.

### Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR, routing, API routes |
| UI Library | React 19 | Component rendering |
| Language | TypeScript 5.7 (strict mode) | Type safety across stack |
| Server State | TanStack React Query 5 | Cache, sync, background refetch |
| Client State | Zustand 5.0 | UI-only state (filters, modals, selections) |
| Database | Firebase Firestore | Multi-tenant document store |
| Auth | Firebase Authentication (Google OAuth) | Identity provider |
| File Storage | Firebase Storage | Tenant-scoped file management |
| Real-time | Firestore onSnapshot listeners | Live data sync |
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
| Deployment | Vercel | Edge network, serverless |

---

## 2. Architecture Principles

These principles govern every design decision. No exceptions.

### 2.1 Security First
- **Every API route authenticates via Firebase ID token** — no header-based trust
- **Every mutation checks RBAC permissions** — server-side, not just UI
- **Every input is validated with Zod** — at the API boundary before any database operation
- **Tenant isolation is enforced at 3 layers** — Firestore rules, API middleware, client state

### 2.2 Single Source of Truth
- **Server data** lives in React Query cache — records, fields, tenant, users
- **Client UI state** lives in Zustand — filters, selections, modals, sidebar
- **Never duplicate server data into Zustand stores**

### 2.3 Fail Loudly, Recover Gracefully
- **Every error has a user-visible message** — no silent failures, no infinite spinners
- **Error boundaries isolate crashes** — a broken field doesn't take down the page
- **Retry logic with exponential backoff** — for transient network failures

### 2.4 Least Privilege
- **Users see only what their role allows** — UI hides unauthorized actions
- **API enforces permissions regardless of UI** — defense in depth
- **Firebase rules are the last line of defense** — even if API is bypassed

### 2.5 Convention Over Configuration
- **Consistent API response format** — every endpoint uses the same envelope
- **Consistent error codes** — typed enum, not freeform strings
- **Consistent file naming** — kebab-case files, PascalCase components, camelCase functions

---

## 3. Folder Structure

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
│   │   ├── layout.tsx                # Shell: sidebar + topbar + permission gate
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
│       ├── auth/route.ts             # Session verification
│       ├── onboarding/route.ts       # Workspace creation
│       ├── invites/route.ts          # Create & validate invites
│       ├── invites/accept/route.ts   # Accept invite
│       ├── records/route.ts          # CRUD records
│       ├── records/[id]/route.ts     # Single record ops (GET, PUT, DELETE)
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
│       ├── templates/route.ts        # Document templates
│       ├── notifications/route.ts    # Notification endpoints
│       ├── billing/
│       │   ├── checkout/route.ts     # Stripe Checkout session
│       │   └── webhook/route.ts      # Stripe webhook handler
│       └── whatsapp/
│           ├── send/route.ts         # Send WhatsApp message
│           └── webhook/route.ts      # Incoming message webhook
│
├── components/
│   ├── providers/
│   │   ├── app-providers.tsx         # Compose all providers (auth, query, theme)
│   │   ├── auth-provider.tsx         # Auth state machine + routing
│   │   ├── query-provider.tsx        # React Query client config
│   │   └── permission-provider.tsx   # RBAC context for <Can> component
│   ├── guards/
│   │   ├── auth-guard.tsx            # Redirect if not authenticated
│   │   ├── role-guard.tsx            # Redirect if insufficient role
│   │   └── can.tsx                   # <Can permission="records.delete">
│   ├── layout/
│   │   ├── shell.tsx                 # Page header wrapper
│   │   ├── sidebar.tsx               # Navigation sidebar
│   │   └── topbar.tsx                # Top bar (search, theme, notifications, user)
│   ├── records/
│   │   ├── record-form.tsx           # Dynamic form from fields
│   │   ├── record-table.tsx          # Data table with filters
│   │   └── dynamic-field.tsx         # Field type renderers (discriminated)
│   ├── pipeline/
│   │   ├── kanban-board.tsx          # Drag-and-drop board
│   │   ├── kanban-column.tsx         # Single stage column
│   │   └── kanban-card.tsx           # Record card in pipeline
│   ├── chat/
│   │   ├── chat-room.tsx             # Message thread
│   │   ├── chat-input.tsx            # Composer with attachments
│   │   └── chat-sidebar.tsx          # Room list
│   ├── filters/
│   │   ├── filter-builder.tsx        # AND/OR filter UI
│   │   └── saved-views.tsx           # Save/load filter views
│   ├── onboarding/
│   │   └── setup-wizard.tsx          # 4-step onboarding wizard
│   ├── files/
│   │   └── file-upload.tsx           # Dropzone file upload
│   ├── errors/
│   │   ├── error-boundary.tsx        # React error boundary wrapper
│   │   ├── page-error.tsx            # Full-page error with retry
│   │   └── field-error.tsx           # Inline field render fallback
│   └── ui/                           # Reusable UI primitives
│       ├── button.tsx, input.tsx, modal.tsx, card.tsx
│       ├── select.tsx, avatar.tsx, badge.tsx, dropdown.tsx
│       ├── switch.tsx, tooltip.tsx, label.tsx, textarea.tsx
│       ├── empty-state.tsx, tabs.tsx, skeleton.tsx
│       └── ...
│
├── lib/
│   ├── firebase/
│   │   ├── client.ts                 # Client SDK init (with config validation)
│   │   ├── admin.ts                  # Admin SDK singleton (with error context)
│   │   └── storage.ts                # File upload/delete (with size + path validation)
│   └── api/
│       ├── middleware.ts              # withAuth() — token verify + user resolve
│       ├── with-validation.ts        # withValidation(schema) — Zod request validation
│       ├── audit.ts                   # createAuditLog() — shared audit logger
│       ├── email.ts                   # Email templates + send via mail collection
│       ├── errors.ts                  # AppError class + error code enum
│       └── response.ts               # Typed API response helpers (ok, fail, paginated)
│
├── hooks/
│   ├── queries/                       # React Query hooks (server state)
│   │   ├── use-records.ts            # useRecords(), useRecord(id), useCreateRecord()
│   │   ├── use-fields.ts             # useFields(), useCreateField(), useReorderFields()
│   │   ├── use-users.ts              # useTeamMembers(), useUpdateRole()
│   │   ├── use-audit.ts              # useAuditLogs(filters)
│   │   ├── use-views.ts              # useSavedViews(), useCreateView()
│   │   ├── use-pipeline.ts           # usePipelineStages(), useMoveRecord()
│   │   ├── use-chat.ts               # useChatRooms(), useMessages(roomId)
│   │   ├── use-notifications.ts      # useNotifications(), useMarkAsRead()
│   │   └── use-tenant.ts             # useTenant(), useUpdateTenant()
│   ├── use-auth.ts                    # useAuth() — current user + permissions
│   ├── use-permission.ts             # usePermission(action) → boolean
│   ├── use-realtime.ts               # useRealtimeCollection(path) — Firestore listeners
│   └── use-debounce.ts               # useDebounce(value, delay)
│
├── stores/                            # Zustand — CLIENT-ONLY UI state
│   ├── ui-store.ts                    # Sidebar collapse, modals, theme
│   ├── filter-store.ts               # Active filters, sort, search query
│   └── selection-store.ts            # Selected record IDs, bulk actions
│
├── types/
│   ├── index.ts                       # Re-exports
│   ├── api.ts                         # ApiResponse<T>, ApiError, PaginatedResponse<T>
│   ├── tenant.ts                      # Tenant, TenantBranding, TenantSubscription
│   ├── user.ts                        # User, UserRole, UserStatus, UserPermissions
│   ├── record.ts                      # CrmRecord, RecordMeta
│   ├── field.ts                       # Field, FieldType, FieldConfig (discriminated union)
│   ├── filter.ts                      # Filter, FilterGroup, FilterOperator, SavedView
│   ├── audit.ts                       # AuditLog, AuditAction, AuditChange
│   ├── pipeline.ts                    # PipelineStage, PipelineConfig
│   ├── chat.ts                        # ChatRoom, ChatMessage
│   ├── notification.ts                # Notification, NotificationType
│   ├── permissions.ts                 # Permission keys, DEFAULT_PERMISSIONS
│   └── billing.ts                     # Plan, Subscription, BillingEvent
│
├── utils/
│   ├── filter-engine.ts               # Filter evaluation (with error handling)
│   ├── format.ts                      # Date/file size/initials (with try-catch)
│   ├── cn.ts                          # Tailwind class merge
│   ├── sanitize.ts                    # Input sanitization + path validation
│   └── constants.ts                   # App-wide constants (limits, defaults)
│
└── validators/
    ├── auth.schema.ts                 # Login, signup, invite acceptance
    ├── field.schema.ts                # Field creation (discriminated by type)
    ├── record.schema.ts               # Record creation (field-schema-aware)
    ├── filter.schema.ts               # Filter + saved view (operator enum validated)
    ├── tenant.schema.ts               # Tenant settings update
    ├── pipeline.schema.ts             # Pipeline stage config
    ├── chat.schema.ts                 # Chat message validation
    └── common.schema.ts               # Shared: pagination, IDs, timestamps
```

---

## 4. Security Architecture

### 4.1 Defense in Depth — 4 Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: CLIENT                                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ <Can> component hides unauthorized UI                     │  │
│  │ usePermission() hook gates client-side actions            │  │
│  │ Zod validates form inputs before submission               │  │
│  └───────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: API MIDDLEWARE                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ withAuth() — verifies Firebase ID token on EVERY request  │  │
│  │ withPermission(action) — checks RBAC before handler runs  │  │
│  │ withValidation(schema) — Zod validates request body/query │  │
│  │ Rate limiter — per-user, per-endpoint limits              │  │
│  └───────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3: API HANDLER                                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Business logic operates on verified auth context          │  │
│  │ Tenant ID comes from verified user, never from headers    │  │
│  │ All writes create audit log entries                       │  │
│  └───────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 4: FIRESTORE SECURITY RULES                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ isTenantMember() on every read/write                      │  │
│  │ Role-based write restrictions (admin, manager)            │  │
│  │ Server-only collections (mail, billing_events)            │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Authentication — Token Flow (No Header Trust)

```
BEFORE (broken):
  Client → x-tenant-id: "abc" header → API trusts it → Firestore query
  PROBLEM: Anyone can set any header. No identity verification.

AFTER (secure):
  Client → Authorization: Bearer <firebase-id-token> → API verifies token
    → Extracts uid from decoded token
    → Looks up user document (gets tenant_id, role, permissions)
    → Passes AuthContext { uid, email, tenantId, role, permissions } to handler
    → Handler operates within verified tenant scope
```

### 4.3 withAuth() Middleware Contract

```typescript
// src/lib/api/middleware.ts

interface AuthContext {
  uid: string;
  email: string;
  tenantId: string;
  role: UserRole;
  permissions: UserPermissions;
  userName: string;
}

type AuthenticatedHandler = (
  req: NextRequest,
  ctx: AuthContext
) => Promise<NextResponse>;

function withAuth(handler: AuthenticatedHandler): RouteHandler;
function withAuth(permission: string, handler: AuthenticatedHandler): RouteHandler;

// Usage in route:
export const POST = withAuth("records.create", async (req, ctx) => {
  // ctx.tenantId is VERIFIED — came from Firestore user doc
  // ctx.permissions already checked for "records.create"
  const body = await req.json();
  // ... create record under ctx.tenantId
});
```

### 4.4 Input Sanitization

```
ALL path segments (tenantId, recordId, fieldId) validated against: /^[a-zA-Z0-9_-]+$/
ALL user-supplied strings sanitized before storage (strip HTML, limit length)
ALL file uploads validated: size (max_size_mb), type (accept[]), filename sanitized
ALL Firestore paths constructed from validated segments only — no string concatenation
```

### 4.5 Rate Limiting

| Endpoint | Limit | Window |
|---|---|---|
| `POST /api/auth` | 20 requests | per minute per IP |
| `POST /api/invites` | 10 requests | per minute per user |
| `POST /api/records` | 60 requests | per minute per user |
| `POST /api/export` | 10 requests | per minute per user |
| `POST /api/whatsapp/send` | 30 requests | per minute per tenant |
| All other endpoints | 100 requests | per minute per user |

Implemented via Vercel Edge Middleware or in-memory rate limiter with sliding window.

---

## 5. Authentication & Session Management

### 5.1 Auth State Machine

```
                    ┌──────────────┐
                    │              │
        ┌──────────│    IDLE      │
        │          │              │
        │          └──────┬───────┘
        │                 │ onAuthStateChanged(user)
        │                 ▼
        │          ┌──────────────┐
        │          │              │
        │          │   LOADING    │──── POST /api/auth { token }
        │          │              │
        │          └──────┬───────┘
        │                 │
        │     ┌───────────┼───────────┐
        │     │           │           │
        │     ▼           ▼           ▼
        │  ┌────────┐ ┌────────┐ ┌────────────┐
        │  │ AUTHED │ │  NEW   │ │   ERROR    │
        │  │        │ │  USER  │ │            │
        │  │→ /dash │ │→ /onb  │ │ retry btn  │
        │  └────────┘ └────────┘ │ error msg  │
        │                        └────────────┘
        │                              │
        │     signOut()                │ retry()
        └──────────────────────────────┘
```

### 5.2 AuthProvider Implementation Contract

```typescript
// Auth provider MUST:
// 1. Use AbortController to cancel in-flight requests on unmount
// 2. Track request generation to discard stale responses
// 3. Expose error state to UI (not just console.log)
// 4. Provide retry mechanism for failed auth checks
// 5. Clear all stores on signOut (auth, query cache, UI state)

interface AuthState {
  status: "idle" | "loading" | "authenticated" | "new_user" | "error";
  user: User | null;
  error: string | null;
  retry: () => void;
}
```

### 5.3 Auth States & Routing

| State | Firebase Auth | Firestore User | Route | UI |
|---|---|---|---|---|
| Idle | Unknown | Unknown | Current page | Full-screen spinner |
| Loading | Has user | Checking... | Current page | Full-screen spinner |
| Authenticated | Has user | Found (200) | `/dashboard` | App shell |
| New user | Has user | Not found (404) | `/onboarding` | Wizard |
| Suspended | Has user | Found, suspended | `/login` | Error message |
| Error | Has user | API failed | Current page | Error + retry button |
| Signed out | No user | — | `/login` | Login page |

---

## 6. API Layer — Middleware & Routes

### 6.1 Middleware Composition Pattern

```typescript
// Every API route is composed from reusable middleware:

// Public route (no auth needed):
export const GET = withValidation(querySchema, async (req, query) => { ... });

// Authenticated route:
export const GET = withAuth(async (req, ctx) => { ... });

// Authenticated + permission check:
export const POST = withAuth("records.create", async (req, ctx) => { ... });

// Authenticated + permission + body validation:
export const POST = withAuth("records.create",
  withValidation(createRecordSchema, async (req, ctx, body) => { ... })
);
```

### 6.2 Shared API Utilities

```
src/lib/api/
├── middleware.ts        # withAuth(permission?, handler)
│                        #   1. Extract Bearer token from Authorization header
│                        #   2. adminAuth.verifyIdToken(token)
│                        #   3. Query user doc by uid across tenants
│                        #   4. Check permission if specified
│                        #   5. Pass AuthContext to handler
│                        #   6. Return 401/403/500 on failure
│
├── with-validation.ts   # withValidation(schema, handler)
│                        #   1. Parse request body with Zod schema
│                        #   2. Return 400 with field-level errors on failure
│                        #   3. Pass typed, validated body to handler
│
├── audit.ts             # createAuditLog(ctx, action, details)
│                        #   Single function for all audit writes
│                        #   Auto-populates: timestamp, user_id, user_name, user_role
│                        #   Fire-and-forget (don't block response)
│
├── email.ts             # sendEmail(to, template, data)
│                        #   Creates mail/{id} doc for Firebase extension
│                        #   Shared HTML templates (invite, welcome, export)
│
├── errors.ts            # AppError class
│                        #   Typed error codes: AUTH_INVALID, PERMISSION_DENIED,
│                        #   VALIDATION_FAILED, NOT_FOUND, CONFLICT, RATE_LIMITED
│                        #   Automatic HTTP status mapping
│
└── response.ts          # ok(data), fail(error), paginated(data, cursor)
                         #   Consistent response envelope for all routes
```

### 6.3 Consistent API Response Format

```typescript
// SUCCESS — Single item
{
  "success": true,
  "data": { "id": "rec_123", "data": { ... }, "meta": { ... } }
}

// SUCCESS — Collection
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 142,
    "cursor": "eyJ0IjoiMjAyNi0wMy0wOSJ9",
    "has_more": true
  }
}

// ERROR — Validation
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Invalid request data",
    "details": {
      "fields": {
        "email": "Invalid email format",
        "role": "Must be one of: admin, manager, employee, viewer"
      }
    }
  }
}

// ERROR — Auth / Permission / Not Found
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You don't have permission to delete records"
  }
}
```

### 6.4 API Route Specifications

| Method | Route | Auth | Permission | Body Schema | Description |
|---|---|---|---|---|---|
| `POST` | `/api/auth` | Token only | — | `{ token }` | Verify session, return user+tenant |
| `POST` | `/api/onboarding` | Token only | — | onboardingSchema | Create workspace |
| `POST` | `/api/invites` | Yes | `team.invite` | inviteSchema | Send invitation |
| `GET` | `/api/invites?id=` | No | — | — | Validate invite (public) |
| `POST` | `/api/invites/accept` | Token only | — | `{ inviteId }` | Accept invitation |
| `GET` | `/api/records` | Yes | `records.read` | — | List records (paginated) |
| `POST` | `/api/records` | Yes | `records.create` | recordSchema | Create record |
| `GET` | `/api/records/[id]` | Yes | `records.read` | — | Get single record |
| `PUT` | `/api/records/[id]` | Yes | `records.update` | recordUpdateSchema | Update record |
| `DELETE` | `/api/records/[id]` | Yes | `records.delete` | — | Soft-delete record |
| `POST` | `/api/records/bulk` | Yes | `records.delete` | `{ ids, action }` | Bulk ops |
| `GET` | `/api/fields` | Yes | — | — | List fields (sorted) |
| `POST` | `/api/fields` | Yes | `settings.edit_fields` | fieldSchema | Create field |
| `PUT` | `/api/fields/reorder` | Yes | `settings.edit_fields` | `{ order[] }` | Reorder fields |
| `GET` | `/api/audit` | Yes | `team.view_activity` | — | Query audit logs |
| `POST` | `/api/export` | Yes | `records.export` | exportSchema | Export records |
| `PUT` | `/api/tenants` | Yes | `settings.edit_branding` | tenantSchema | Update settings |
| `GET` | `/api/users` | Yes | `team.invite` | — | List team members |
| `PUT` | `/api/users/[id]` | Yes | `team.change_role` | roleSchema | Change user role |
| `DELETE` | `/api/users/[id]` | Yes | `team.remove` | — | Remove team member |
| `GET` | `/api/views` | Yes | — | — | List saved views |
| `POST` | `/api/views` | Yes | `settings.manage_views` | viewSchema | Create saved view |
| `GET` | `/api/pipeline` | Yes | — | — | Get pipeline config |
| `PUT` | `/api/pipeline` | Yes | `settings.edit_fields` | pipelineSchema | Update stages |
| `GET` | `/api/chat` | Yes | `chat.send` | — | List rooms |
| `POST` | `/api/chat` | Yes | `chat.send` | messageSchema | Send message |
| `GET` | `/api/notifications` | Yes | — | — | Get notifications |
| `PUT` | `/api/notifications` | Yes | — | `{ ids }` | Mark as read |
| `POST` | `/api/billing/checkout` | Yes | Admin only | `{ planId }` | Create Stripe session |
| `POST` | `/api/billing/webhook` | Stripe sig | — | Stripe event | Handle billing events |
| `POST` | `/api/whatsapp/send` | Yes | `chat.send` | whatsappSchema | Send WhatsApp msg |
| `POST` | `/api/whatsapp/webhook` | WA sig | — | WA event | Receive WhatsApp msg |

---

## 7. Multi-Tenant Data Model

### 7.1 Firestore Document Structure

```
firestore/
│
├── tenants/{tenantId}
│   ├── branding
│   │   ├── name: string                    # "Acme Corp"
│   │   ├── logo_url: string | null
│   │   ├── primary_color: string           # "#7C3AED"
│   │   └── theme: "dark" | "light"
│   ├── subscription
│   │   ├── status: "free" | "trial" | "active" | "past_due" | "suspended"
│   │   ├── plan_id: string | null          # Stripe price ID
│   │   ├── stripe_customer_id: string | null
│   │   ├── stripe_subscription_id: string | null
│   │   ├── trial_end_date: string | null
│   │   ├── current_period_end: string | null
│   │   └── billing_email: string | null
│   ├── limits                              # Plan-based limits
│   │   ├── max_records: number             # -1 = unlimited
│   │   ├── max_users: number
│   │   ├── max_storage_mb: number
│   │   └── max_fields: number
│   ├── usage                               # Current usage counters
│   │   ├── record_count: number
│   │   ├── user_count: number
│   │   ├── storage_used_mb: number
│   │   └── field_count: number
│   ├── record_label: string                # "Candidates"
│   ├── record_label_singular: string       # "Candidate"
│   ├── document_label: string              # "Certificates"
│   ├── pipeline_config
│   │   ├── enabled: boolean
│   │   └── stages: PipelineStage[]
│   ├── whatsapp_config
│   │   ├── enabled: boolean
│   │   ├── phone_number_id: string | null
│   │   └── business_account_id: string | null
│   ├── created_at: string (ISO 8601)
│   └── created_by: string (uid)
│
│   └── /users/{userId}
│       ├── email: string
│       ├── name: string
│       ├── avatar_url: string | null
│       ├── role: "admin" | "manager" | "employee" | "viewer"
│       ├── status: "active" | "invited" | "suspended"
│       ├── permissions: UserPermissions
│       ├── notification_prefs
│       │   ├── email_digest: boolean
│       │   ├── record_assigned: boolean
│       │   └── chat_mentions: boolean
│       ├── created_at: string
│       ├── updated_at: string
│       └── last_active: string
│
│   └── /records/{recordId}
│       ├── tenant_id: string               # Denormalized for collection group queries
│       ├── data: { [fieldId]: value }       # Dynamic field values
│       ├── meta
│       │   ├── created_by: string
│       │   ├── created_at: string
│       │   ├── updated_by: string | null
│       │   ├── updated_at: string | null
│       │   ├── deleted: boolean
│       │   ├── deleted_by: string | null
│       │   ├── deleted_at: string | null
│       │   ├── version: number              # Starts at 1, increments on update
│       │   ├── pipeline_stage: string | null
│       │   └── assigned_to: string | null   # userId for ownership
│       └── tags: string[]                   # User-defined tags
│
│   └── /fields/{fieldId}
│       ├── label: string
│       ├── type: FieldType                  # 12 types
│       ├── order: number                    # Unique, sequential
│       ├── required: boolean
│       ├── sensitive: boolean
│       ├── filterable: boolean
│       ├── searchable: boolean
│       ├── show_in_table: boolean
│       ├── config: FieldConfig              # Discriminated by type
│       ├── created_at: string
│       ├── created_by: string
│       └── updated_at: string
│
│   └── /activity/{activityId}
│       ├── timestamp: string
│       ├── user_id: string
│       ├── user_name: string
│       ├── user_role: UserRole
│       ├── action: AuditAction
│       ├── entity_type: string
│       ├── entity_id: string
│       ├── entity_name: string | null
│       ├── changes: AuditChange[] | null
│       └── snapshot: object | null
│
│   └── /views/{viewId}                     # Server-persisted saved views
│       ├── name: string
│       ├── filters: FilterGroup
│       ├── sort: SortConfig[]
│       ├── columns: ColumnConfig[]
│       ├── created_by: string
│       ├── shared: boolean                  # Visible to all team members
│       ├── pinned: boolean
│       ├── created_at: string
│       └── updated_at: string
│
│   └── /documents/{docId}
│       ├── record_id: string
│       ├── field_id: string
│       ├── file_name: string
│       ├── file_url: string
│       ├── file_size: number
│       ├── mime_type: string
│       ├── uploaded_by: string
│       └── uploaded_at: string
│
│   └── /templates/{templateId}
│       ├── name: string
│       ├── description: string
│       ├── content: string                  # HTML template with {{field}} placeholders
│       ├── field_mappings: { [placeholder]: fieldId }
│       ├── created_by: string
│       ├── created_at: string
│       └── updated_at: string
│
│   └── /chat_rooms/{roomId}
│       ├── type: "record" | "team" | "direct"
│       ├── name: string | null
│       ├── record_id: string | null         # If type === "record"
│       ├── participants: string[]
│       ├── last_message_at: string
│       └── created_at: string
│
│   └── /chat_rooms/{roomId}/messages/{msgId}
│       ├── sender_id: string
│       ├── sender_name: string
│       ├── content: string
│       ├── attachments: Attachment[]
│       ├── read_by: string[]
│       ├── edited: boolean
│       ├── deleted: boolean
│       └── created_at: string
│
│   └── /notifications/{notificationId}
│       ├── user_id: string                  # Recipient
│       ├── type: NotificationType
│       ├── title: string
│       ├── body: string
│       ├── link: string | null              # In-app deep link
│       ├── read: boolean
│       ├── actor_id: string                 # Who triggered it
│       ├── actor_name: string
│       └── created_at: string
│
├── invites/{inviteId}
│   ├── tenant_id: string
│   ├── tenant_name: string
│   ├── email: string (lowercase)
│   ├── role: UserRole
│   ├── invited_by: string
│   ├── invited_by_name: string
│   ├── status: "pending" | "accepted" | "expired"
│   ├── created_at: string
│   ├── expires_at: string                   # 7-day expiry
│   ├── accepted_at: string | null
│   └── accepted_by: string | null
│
├── mail/{mailId}                            # Firebase Trigger Email extension
│   ├── to: string
│   ├── message: { subject: string, html: string }
│   └── created_at: string
│
└── billing_events/{eventId}                 # Stripe webhook audit trail
    ├── stripe_event_id: string
    ├── type: string
    ├── tenant_id: string
    ├── processed: boolean
    └── created_at: string
```

### 7.2 Tenant Isolation — 3-Layer Enforcement

| Layer | Mechanism | What It Prevents |
|---|---|---|
| **Firestore Rules** | `isTenantMember(tenantId)` on every read/write | Direct Firestore access from any client |
| **API Middleware** | `withAuth()` resolves tenant from verified user doc | Header spoofing, cross-tenant API calls |
| **Client State** | Single tenant context per session in React Query | Accidental cross-tenant data leakage in UI |

### 7.3 Soft Deletes

Records use soft deletes (`meta.deleted = true`). This enables:
- **Undo/restore** within a time window
- **Audit trail** — deleted records retain their snapshot
- **Data retention** — compliance with data policies
- Queries always filter `where("meta.deleted", "==", false)` by default

---

## 8. State Management Architecture

### 8.1 Two-Layer Model

```
┌─────────────────────────────────────────────────────────────────┐
│                        REACT COMPONENTS                         │
│                                                                 │
│  useRecords()  useTenant()  useAuth()    useFilterStore()       │
│  useFields()   useAudit()   useChat()    useSelectionStore()    │
│       │            │           │              │                  │
│       ▼            ▼           ▼              ▼                  │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐  │
│  │   REACT QUERY CACHE     │  │   ZUSTAND STORES            │  │
│  │   (Server State)        │  │   (Client UI State)         │  │
│  │                         │  │                             │  │
│  │  records: CrmRecord[]   │  │  filters: FilterGroup       │  │
│  │  fields: Field[]        │  │  sort: SortConfig[]         │  │
│  │  tenant: Tenant         │  │  searchQuery: string        │  │
│  │  users: User[]          │  │  selectedIds: string[]      │  │
│  │  auditLogs: AuditLog[]  │  │  sidebarCollapsed: boolean  │  │
│  │  views: SavedView[]     │  │  activeModal: string | null │  │
│  │  chatRooms: ChatRoom[]  │  │  theme: "dark" | "light"    │  │
│  │  notifications: Notif[] │  │                             │  │
│  │                         │  │                             │  │
│  │  Auto-refetch on focus  │  │  Persists in memory only    │  │
│  │  Background sync        │  │  Resets on page reload      │  │
│  │  Optimistic mutations   │  │  No server interaction      │  │
│  │  Cache invalidation     │  │                             │  │
│  └────────────┬────────────┘  └─────────────────────────────┘  │
│               │                                                 │
│               ▼                                                 │
│  ┌─────────────────────────┐                                   │
│  │   FIRESTORE LISTENERS   │                                   │
│  │   (Real-time Sync)      │                                   │
│  │                         │                                   │
│  │  onSnapshot → update    │                                   │
│  │  React Query cache      │                                   │
│  └─────────────────────────┘                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 React Query Configuration

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,          // Data fresh for 30s
      gcTime: 5 * 60_000,         // Cache kept for 5 min after unmount
      refetchOnWindowFocus: true,  // Refresh when user returns to tab
      retry: 2,                    // Retry failed requests twice
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    },
    mutations: {
      onError: (error) => toast.error(error.message),
    },
  },
});
```

### 8.3 Query Key Convention

```typescript
// All query keys follow: [entity, scope, ...params]
queryKey: ["records", tenantId]                    // All records
queryKey: ["records", tenantId, recordId]          // Single record
queryKey: ["fields", tenantId]                     // All fields
queryKey: ["users", tenantId]                      // Team members
queryKey: ["audit", tenantId, { action, limit }]   // Filtered audit
queryKey: ["views", tenantId]                      // Saved views
queryKey: ["tenant", tenantId]                     // Tenant settings
queryKey: ["notifications", tenantId, uid]         // User notifications
queryKey: ["chat", tenantId, roomId]               // Chat messages
```

### 8.4 Optimistic Mutations

```typescript
// Example: Create record with instant UI update
const createRecord = useMutation({
  mutationFn: (data) => api.post("/api/records", data),
  onMutate: async (newRecord) => {
    // Cancel background refetches
    await queryClient.cancelQueries(["records", tenantId]);
    // Snapshot previous state
    const previous = queryClient.getQueryData(["records", tenantId]);
    // Optimistically add to cache
    queryClient.setQueryData(["records", tenantId], (old) => [
      { ...newRecord, id: "temp_" + Date.now(), meta: { ... } },
      ...old,
    ]);
    return { previous };
  },
  onError: (err, _, context) => {
    // Rollback on failure
    queryClient.setQueryData(["records", tenantId], context.previous);
    toast.error("Failed to create record");
  },
  onSettled: () => {
    // Refetch to get server truth
    queryClient.invalidateQueries(["records", tenantId]);
  },
});
```

### 8.5 Zustand Stores (Client UI Only)

```typescript
// filter-store.ts — No server data, pure UI state
interface FilterState {
  activeFilters: FilterGroup;
  activeSort: SortConfig[];
  searchQuery: string;
  activeViewId: string | null;
  setFilters: (filters: FilterGroup) => void;
  setSort: (sort: SortConfig[]) => void;
  setSearch: (query: string) => void;
  setActiveView: (viewId: string | null) => void;
  clearAll: () => void;
}

// selection-store.ts
interface SelectionState {
  selectedIds: Set<string>;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
}

// ui-store.ts
interface UIState {
  sidebarCollapsed: boolean;
  activeModal: string | null;
  theme: "dark" | "light";
  toggleSidebar: () => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  setTheme: (theme: "dark" | "light") => void;
}
```

---

## 9. Role-Based Access Control (RBAC)

### 9.1 Permission Matrix

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
chat.view_logs               ✓        ✗         ✗         ✗

settings.edit_fields         ✓        ✗         ✗         ✗
settings.edit_branding       ✓        ✗         ✗         ✗
settings.edit_templates      ✓        ✓         ✗         ✗
settings.manage_views        ✓        ✓         ✓         ✗
settings.edit_pipeline       ✓        ✗         ✗         ✗
settings.manage_billing      ✓        ✗         ✗         ✗
settings.manage_whatsapp     ✓        ✗         ✗         ✗
```

### 9.2 Permission Enforcement Points

```
1. UI LAYER — <Can> component
   <Can permission="records.delete">
     <Button variant="destructive">Delete</Button>
   </Can>
   // Renders nothing if user lacks permission

2. API LAYER — withAuth() middleware
   export const DELETE = withAuth("records.delete", handler);
   // Returns 403 before handler executes

3. FIRESTORE RULES — isTenantAdmin() / isTenantManager()
   // Last line of defense, blocks direct SDK access
```

### 9.3 Custom Roles (Future)

The permission system is designed to support custom roles:
```typescript
// tenants/{id}/roles/{roleId}
interface CustomRole {
  id: string;
  name: string;                    // "Sales Lead"
  base_role: UserRole;             // Inherits from a base role
  overrides: Partial<UserPermissions>; // Granular permission overrides
  created_by: string;
  created_at: string;
}
```

---

## 10. Custom Field System

### 10.1 Supported Field Types (12)

| Type | Input | Required Config | Optional Config |
|---|---|---|---|
| `text` | Text input | — | max_length, placeholder |
| `textarea` | Multi-line | — | max_length, placeholder |
| `number` | Number input | — | min, max, precision |
| `phone` | Phone input | — | placeholder, country_code |
| `email` | Email input | — | placeholder |
| `date` | Date picker | — | include_time |
| `select` | Dropdown | **options[]** | placeholder |
| `multi_select` | Multi-dropdown | **options[]** | placeholder, max_selections |
| `file` | Dropzone upload | — | accept[], multiple, max_size_mb |
| `url` | URL input | — | open_in_new_tab |
| `currency` | Currency input | **currency_code** | min, max, precision |
| `boolean` | Toggle switch | — | default_value |

### 10.2 Discriminated Union for FieldConfig

```typescript
// Type-safe config — impossible to create select without options
type FieldConfig =
  | { type: "text"; max_length?: number; placeholder?: string }
  | { type: "textarea"; max_length?: number; placeholder?: string }
  | { type: "number"; min?: number; max?: number; precision?: number }
  | { type: "phone"; placeholder?: string; country_code?: string }
  | { type: "email"; placeholder?: string }
  | { type: "date"; include_time?: boolean }
  | { type: "select"; options: SelectOption[] }
  | { type: "multi_select"; options: SelectOption[]; max_selections?: number }
  | { type: "file"; accept?: string[]; multiple?: boolean; max_size_mb?: number }
  | { type: "url"; open_in_new_tab?: boolean }
  | { type: "currency"; currency_code: string; min?: number; max?: number; precision?: number }
  | { type: "boolean"; default_value?: boolean };

interface SelectOption {
  label: string;
  value: string;
  color?: string;         // Badge color in table/kanban
}
```

### 10.3 Field Validation on Record Save

```typescript
// Server-side validation flow:
// 1. Load tenant fields from Firestore
// 2. For each field in submitted data:
//    a. Verify field_id exists in tenant's fields
//    b. Check type matches expected value type
//    c. Enforce required flag
//    d. Validate against config constraints (min/max, options, etc.)
// 3. Reject unknown field IDs (prevent data pollution)
// 4. Return field-level errors if any fail

// Example error:
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Record validation failed",
    "details": {
      "fields": {
        "field_status_1": "Value 'Unknown' is not in allowed options",
        "field_salary_1": "Value must be between 0 and 1000000",
        "field_email_1": "This field is required"
      }
    }
  }
}
```

---

## 11. Filter & Search Engine

### 11.1 Architecture

```
User Input                  Filter Engine               Output
─────────────────────────────────────────────────────────────────

SearchBar ──┐
             │    ┌──────────────────────────────┐
FilterBuilder─┤───▶│  1. Text search (searchable   │
             │    │     fields only)               │
SortConfig ──┤    │  2. applyFilters(records,      │───▶ Filtered
             │    │     filterGroup, fields)        │     + Sorted
SavedView ───┘    │  3. applySort(records,          │     Records
                  │     sortConfig)                │
                  │  4. Error boundary per filter   │
                  └──────────────────────────────┘
```

### 11.2 Operators by Field Type

| Field Type | Operators |
|---|---|
| text, textarea | is, is_not, contains, not_contains, starts_with, ends_with, is_empty, is_not_empty |
| number, currency | eq, neq, gt, gte, lt, lte, between, is_empty, is_not_empty |
| select | is, is_not, is_any_of, is_none_of, is_empty, is_not_empty |
| multi_select | contains, not_contains, contains_any, contains_all, is_empty, is_not_empty |
| date | is, is_before, is_after, is_between, is_today, is_this_week, is_this_month, is_last_7_days, is_last_30_days, is_empty, is_not_empty |
| file | has_file, has_no_file, file_count_gt, file_count_lt, file_type_is |
| boolean | is_true, is_false |
| email, phone, url | is, is_not, contains, not_contains, is_empty, is_not_empty |

### 11.3 Filter Engine Error Handling

```typescript
// Every filter evaluation is wrapped in try-catch:
function evaluateFilter(record, filter, fields): boolean {
  try {
    const value = record.data[filter.field_id];
    const field = fields.find(f => f.id === filter.field_id);
    if (!field) return true; // Unknown field — don't exclude record
    return evaluateOperator(value, filter.operator, filter.value, field.type);
  } catch (error) {
    console.warn(`Filter evaluation failed for ${filter.field_id}:`, error);
    return true; // On error, include record (fail open for display)
  }
}

// Date parsing is safe:
function safeParseDateISO(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  try {
    const date = parseISO(value);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
}
```

### 11.4 Saved Views (Server-Persisted)

```
tenants/{tenantId}/views/{viewId}
├── name: "Active Candidates"
├── filters: { match: "all", filters: [...] }
├── sort: [{ field_id: "...", direction: "asc" }]
├── columns: [{ field_id: "...", width: 200, visible: true }]
├── shared: true                    # Visible to all team members
├── pinned: true                    # Shows in quick-access bar
├── created_by: "uid_123"
├── created_at: "2026-03-09T..."
└── updated_at: "2026-03-09T..."
```

---

## 12. Real-Time Data Sync

### 12.1 Firestore Listeners

```typescript
// useRealtimeCollection hook — wires Firestore onSnapshot to React Query cache

function useRealtimeCollection<T>(
  path: string,
  queryKey: QueryKey,
  options?: { where?: WhereClause[]; orderBy?: OrderByClause }
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const ref = collection(db, path);
    const q = buildQuery(ref, options);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
      queryClient.setQueryData(queryKey, data);
    }, (error) => {
      console.error(`Real-time listener error for ${path}:`, error);
      // Don't crash — React Query will serve stale cache
    });

    return () => unsubscribe();
  }, [path, queryKey]);
}
```

### 12.2 What Gets Real-Time Sync

| Collection | Listener | Reason |
|---|---|---|
| `tenants/{id}/records` | Yes | Team members adding/editing records |
| `tenants/{id}/fields` | Yes | Admin may add fields during others' sessions |
| `tenants/{id}` | Yes | Branding/settings changes |
| `tenants/{id}/notifications` | Yes | Live notification bell |
| `tenants/{id}/chat_rooms/*/messages` | Yes | Real-time chat |
| `tenants/{id}/activity` | No | Audit logs fetched on-demand |
| `tenants/{id}/views` | Yes | Shared views created by teammates |

---

## 13. Invite & Team Management

### 13.1 Invite Flow

```
Admin/Manager clicks "Invite"
        │
        ▼
POST /api/invites { email, role }
        │
        ├── withAuth("team.invite") verifies permission
        ├── Validate email not already a member (case-insensitive)
        ├── Validate email not already invited (pending)
        ├── Check tenant user limit (limits.max_users)
        │
        ├──▶ Creates invites/{id} (status: "pending", expires_at: +7 days)
        ├──▶ Creates mail/{id} (triggers invite email)
        └──▶ Creates audit log (INVITE_SENT)
                    │
                    ▼
           Recipient receives email
           Clicks link → /invite/{inviteId}
                    │
                    ▼
           Page calls GET /api/invites?id={id}
           Shows: tenant name, role, inviter name
           Shows: "Sign in with Google to accept"
                    │
                    ▼
           Signs in with Google
                    │
                    ▼
           POST /api/invites/accept { inviteId }
                    │
                    ├── Verify invite exists and status === "pending"
                    ├── Verify invite not expired (expires_at > now)
                    ├── Verify email matches (case-insensitive)
                    ├── Check if user already exists in tenant (idempotent)
                    │
                    ├──▶ Creates tenants/{tid}/users/{uid}
                    ├──▶ Updates invite status → "accepted"
                    ├──▶ Increments tenant usage.user_count
                    └──▶ Creates audit log (INVITE_ACCEPTED)
                              │
                              ▼
                    AuthProvider detects user → /dashboard
```

### 13.2 Team Member Operations

| Operation | Permission | API | Audit Action |
|---|---|---|---|
| Invite member | `team.invite` | `POST /api/invites` | INVITE_SENT |
| Cancel invite | `team.invite` | `DELETE /api/invites/{id}` | INVITE_CANCELLED |
| Accept invite | Token only | `POST /api/invites/accept` | INVITE_ACCEPTED |
| Change role | `team.change_role` | `PUT /api/users/{id}` | ROLE_CHANGED |
| Suspend member | `team.remove` | `PUT /api/users/{id}` | USER_SUSPENDED |
| Remove member | `team.remove` | `DELETE /api/users/{id}` | USER_REMOVED |

---

## 14. Onboarding Flow

```
New user signs in → AuthProvider gets 404 → redirect to /onboarding

Step 1: Company                Step 2: Branding
┌─────────────────────┐       ┌─────────────────────┐
│ Company name *      │       │ Brand color (picker) │
│ Industry preset     │ ────▶ │ Theme (dark/light)   │
│ Record label *      │       │ Logo upload (opt)    │
│ Record singular *   │       │                      │
└─────────────────────┘       └─────────────────────┘
                                       │
Step 3: Team                   Step 4: Summary
┌─────────────────────┐       ┌─────────────────────┐
│ Invite emails (opt) │       │ Review all settings  │
│ + role per invite   │ ────▶ │ Edit any step        │
│ Add up to 5         │       │ [Launch Workspace]   │
└─────────────────────┘       └─────────────────────┘
                                       │
                                       ▼
                             POST /api/onboarding
                             Creates: tenant + admin user + invites + mail
                             Initializes: default fields for industry preset
                                       │
                                       ▼
                                  /dashboard
```

### Industry Presets (Default Fields)

| Industry | Default Fields Created |
|---|---|
| Manpower Agency | Name, Email, Phone, Status, Position, Nationality, Passport No., Salary |
| Real Estate | Name, Email, Phone, Status, Property Type, Budget, Location, Agent |
| Sales Team | Name, Email, Phone, Status, Company, Deal Value, Stage, Source |
| HR Department | Name, Email, Phone, Status, Department, Position, Start Date, Manager |
| Custom | Name, Email, Phone, Status (minimal starter) |

---

## 15. File Storage & Upload

### 15.1 Storage Path Convention

```
gs://{bucket}/tenants/{tenantId}/records/{recordId}/{fieldId}/{sanitized_filename}
```

### 15.2 Upload Validation

```typescript
async function uploadFile(file: File, tenantId: string, recordId: string, fieldId: string, fieldConfig: FileFieldConfig) {
  // 1. Validate path segments (no traversal)
  validatePathSegment(tenantId);
  validatePathSegment(recordId);
  validatePathSegment(fieldId);

  // 2. Validate file size
  const maxSize = (fieldConfig.max_size_mb ?? 10) * 1024 * 1024;
  if (file.size > maxSize) {
    throw new AppError("FILE_TOO_LARGE", `File exceeds ${fieldConfig.max_size_mb}MB limit`);
  }

  // 3. Validate file type
  if (fieldConfig.accept?.length) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!fieldConfig.accept.includes(`.${ext}`)) {
      throw new AppError("FILE_TYPE_REJECTED", `File type .${ext} not allowed`);
    }
  }

  // 4. Validate tenant storage quota
  // Check tenant.usage.storage_used_mb < tenant.limits.max_storage_mb

  // 5. Sanitize filename
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

  // 6. Upload with metadata
  const metadata = { tenantId, recordId, fieldId, uploadedBy: uid, originalName: file.name };

  // 7. Return download URL
}

function validatePathSegment(segment: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(segment)) {
    throw new AppError("INVALID_PATH", "Path segment contains invalid characters");
  }
}
```

---

## 16. Audit Logging System

### 16.1 Audit Actions (Complete)

```typescript
type AuditAction =
  // Records
  | "RECORD_CREATED" | "RECORD_UPDATED" | "RECORD_DELETED" | "RECORD_RESTORED"
  | "RECORD_EXPORTED" | "RECORD_BULK_DELETED" | "RECORD_STAGE_CHANGED"
  | "RECORD_ASSIGNED"
  // Fields
  | "FIELD_CREATED" | "FIELD_UPDATED" | "FIELD_DELETED" | "FIELD_REORDERED"
  // Team
  | "INVITE_SENT" | "INVITE_ACCEPTED" | "INVITE_CANCELLED"
  | "ROLE_CHANGED" | "USER_SUSPENDED" | "USER_REMOVED"
  // Settings
  | "SETTINGS_UPDATED" | "BRANDING_UPDATED" | "PIPELINE_UPDATED"
  // Auth
  | "USER_LOGIN" | "USER_LOGOUT"
  // Billing
  | "SUBSCRIPTION_CREATED" | "SUBSCRIPTION_UPDATED" | "SUBSCRIPTION_CANCELLED"
  // Templates
  | "TEMPLATE_CREATED" | "TEMPLATE_UPDATED" | "TEMPLATE_DELETED"
  | "DOCUMENT_GENERATED";
```

### 16.2 Shared Audit Logger

```typescript
// src/lib/api/audit.ts
async function createAuditLog(
  ctx: AuthContext,
  action: AuditAction,
  details: {
    entity_type: string;
    entity_id: string;
    entity_name?: string;
    changes?: AuditChange[];
    snapshot?: object;
  }
): Promise<void> {
  // Fire-and-forget — never block API response for audit
  adminDb.collection(`tenants/${ctx.tenantId}/activity`).add({
    timestamp: new Date().toISOString(),
    user_id: ctx.uid,
    user_name: ctx.userName,
    user_role: ctx.role,
    action,
    ...details,
  }).catch((error) => {
    console.error("Audit log write failed:", error);
    // Don't throw — audit failure should never break the operation
  });
}
```

### 16.3 Change Tracking

```typescript
interface AuditChange {
  field_id: string;
  field_label: string;
  old_value: unknown;
  new_value: unknown;
}

// On record update, diff old vs new:
function computeChanges(oldData: Record<string, unknown>, newData: Record<string, unknown>, fields: Field[]): AuditChange[] {
  return fields
    .filter(f => JSON.stringify(oldData[f.id]) !== JSON.stringify(newData[f.id]))
    .map(f => ({
      field_id: f.id,
      field_label: f.label,
      old_value: oldData[f.id] ?? null,
      new_value: newData[f.id] ?? null,
    }));
}
```

---

## 17. Pipeline / Kanban Board

### 17.1 Data Model

```typescript
// Stored in tenants/{tenantId}.pipeline_config
interface PipelineConfig {
  enabled: boolean;
  stages: PipelineStage[];
}

interface PipelineStage {
  id: string;
  label: string;                // "New Lead", "Contacted", "Qualified", "Won", "Lost"
  color: string;                // "#22c55e"
  order: number;
  is_terminal: boolean;         // Won/Lost — records here are "closed"
}
```

### 17.2 Kanban Flow

```
GET /api/records + GET /api/pipeline
        │
        ▼
┌───────────┬───────────┬───────────┬───────────┬───────────┐
│  New Lead │ Contacted │ Qualified │    Won    │   Lost    │
│  (3)      │  (7)      │  (2)      │  (12)     │  (4)      │
│           │           │           │           │           │
│ ┌───────┐ │ ┌───────┐ │ ┌───────┐ │ ┌───────┐ │ ┌───────┐ │
│ │Card A │ │ │Card D │ │ │Card H │ │ │Card J │ │ │Card N │ │
│ └───────┘ │ └───────┘ │ └───────┘ │ └───────┘ │ └───────┘ │
│ ┌───────┐ │ ┌───────┐ │ ┌───────┐ │           │           │
│ │Card B │ │ │Card E │ │ │Card I │ │           │           │
│ └───────┘ │ └───────┘ │ └───────┘ │           │           │
│ ┌───────┐ │ ┌───────┐ │           │           │           │
│ │Card C │ │ │Card F │ │           │           │           │
│ └───────┘ │ └───────┘ │           │           │           │
└───────────┴───────────┴───────────┴───────────┴───────────┘

Drag Card B from "New Lead" to "Contacted":
  → PUT /api/records/{id} { meta: { pipeline_stage: "contacted" } }
  → Audit: RECORD_STAGE_CHANGED { old: "new_lead", new: "contacted" }
  → Optimistic UI update → React Query cache mutation
```

---

## 18. Chat & Messaging

### 18.1 Chat Room Types

| Type | Purpose | Participants |
|---|---|---|
| `record` | Discussion about a specific record | Auto: all team members with record access |
| `team` | General team channel | All active team members |
| `direct` | 1:1 private message | Two specific users |

### 18.2 Real-Time Message Flow

```
User types message → POST /api/chat { roomId, content, attachments }
        │
        ├── withAuth("chat.send") verifies permission
        ├── Creates message doc in chat_rooms/{roomId}/messages
        ├── Updates chat_rooms/{roomId}.last_message_at
        ├── Creates notifications for mentioned users (@user)
        │
        ▼
Firestore onSnapshot listener (all participants)
        │
        ▼
React Query cache updated → UI re-renders instantly
```

---

## 19. Document Templates & PDF Generation

### 19.1 Template System

```
Admin creates template:
  "Offer Letter"
  Content: "Dear {{candidate_name}}, We are pleased to offer you the position
            of {{position}} at {{company_name}} with a salary of {{salary}}..."

Field mappings:
  {{candidate_name}} → field_name_1
  {{position}}       → field_position_1
  {{salary}}         → field_salary_1
  {{company_name}}   → tenant.branding.name (system variable)
  {{date}}           → current date (system variable)
```

### 19.2 PDF Generation Flow

```
User clicks "Generate PDF" on a record
        │
        ▼
POST /api/export { record_id, template_id, format: "pdf" }
        │
        ├── Load template + record + fields
        ├── Replace placeholders with record values
        ├── Render HTML → PDF via @react-pdf/renderer
        ├── Upload to Firebase Storage
        ├── Audit: DOCUMENT_GENERATED
        │
        ▼
Return { download_url } → browser downloads PDF
```

---

## 20. WhatsApp Integration

### 20.1 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CRM WhatsTask                         │
│                                                         │
│  Record Detail Page                                     │
│  ┌─────────────────────────────────────┐               │
│  │ Phone: +1234567890                  │               │
│  │ [Send WhatsApp Message]             │               │
│  │                                     │               │
│  │ Template: "Follow-up"              │               │
│  │ Preview: "Hi John, following up..." │               │
│  └────────────────┬────────────────────┘               │
│                   │                                     │
└───────────────────┼─────────────────────────────────────┘
                    │ POST /api/whatsapp/send
                    ▼
         ┌──────────────────┐
         │  WhatsApp Cloud  │
         │  Business API    │
         │                  │──── Delivers message to recipient
         │  Meta Platform   │
         └────────┬─────────┘
                  │ Webhook: delivery status + incoming replies
                  ▼
         POST /api/whatsapp/webhook
                  │
                  ├── Verify webhook signature
                  ├── Store message in chat_rooms/{roomId}/messages
                  ├── Create notification for assigned user
                  └── Update record activity
```

### 20.2 WhatsApp Message Templates

Pre-approved templates (required by Meta):
- Follow-up reminder
- Appointment confirmation
- Document request
- Status update
- Welcome message

---

## 21. Billing & Subscriptions

### 21.1 Plan Tiers

| Feature | Free | Starter | Professional | Enterprise |
|---|---|---|---|---|
| Records | 100 | 1,000 | 10,000 | Unlimited |
| Team members | 3 | 10 | 50 | Unlimited |
| Storage | 500MB | 5GB | 50GB | 500GB |
| Custom fields | 10 | 25 | Unlimited | Unlimited |
| Pipeline board | No | Yes | Yes | Yes |
| Chat | No | Yes | Yes | Yes |
| WhatsApp | No | No | Yes | Yes |
| PDF templates | No | 3 | Unlimited | Unlimited |
| Audit log retention | 30 days | 90 days | 1 year | Unlimited |
| Custom roles | No | No | Yes | Yes |
| API access | No | No | Yes | Yes |
| Priority support | No | No | No | Yes |

### 21.2 Stripe Integration Flow

```
Admin clicks "Upgrade" → /settings/billing
        │
        ▼
POST /api/billing/checkout { planId }
        │
        ├── Create Stripe Checkout Session
        │   customer: tenant.subscription.stripe_customer_id (or create new)
        │   price: planId
        │   success_url: /settings/billing?success=true
        │   cancel_url: /settings/billing
        │
        ▼
Redirect to Stripe Checkout
        │
        ▼ (on success)
Stripe fires webhook → POST /api/billing/webhook
        │
        ├── Verify Stripe signature
        ├── Handle event types:
        │   checkout.session.completed → activate subscription
        │   invoice.paid → extend period
        │   invoice.payment_failed → mark as past_due
        │   customer.subscription.deleted → mark as suspended
        │
        ├── Update tenants/{id}.subscription
        ├── Update tenants/{id}.limits (based on plan)
        ├── Log billing_events/{id}
        └── Audit: SUBSCRIPTION_CREATED / SUBSCRIPTION_UPDATED
```

### 21.3 Limit Enforcement

```typescript
// Before every create operation, check limits:
async function checkTenantLimit(tenantId: string, resource: "records" | "users" | "fields" | "storage"): Promise<void> {
  const tenant = await getTenant(tenantId);
  const { limits, usage } = tenant;

  const checks = {
    records: () => limits.max_records !== -1 && usage.record_count >= limits.max_records,
    users: () => limits.max_users !== -1 && usage.user_count >= limits.max_users,
    fields: () => limits.max_fields !== -1 && usage.field_count >= limits.max_fields,
    storage: () => limits.max_storage_mb !== -1 && usage.storage_used_mb >= limits.max_storage_mb,
  };

  if (checks[resource]()) {
    throw new AppError("LIMIT_REACHED", `You've reached your plan's ${resource} limit. Upgrade to add more.`);
  }
}
```

---

## 22. Notification System

### 22.1 Notification Types

| Type | Trigger | Recipients |
|---|---|---|
| `record_created` | New record added | All team members with `records.read` |
| `record_assigned` | Record assigned to user | Assigned user |
| `record_stage_changed` | Pipeline stage moved | Record assignee + managers |
| `invite_accepted` | Team member joined | Admin who sent invite |
| `chat_mention` | @mention in chat | Mentioned user |
| `chat_message` | New message in room | All room participants |
| `export_ready` | PDF/export completed | User who requested it |
| `limit_warning` | 80% of plan limit reached | All admins |

### 22.2 Delivery

```
Event triggers notification
        │
        ├── Create notification doc in tenants/{id}/notifications/{nid}
        │   (real-time listener updates UI badge instantly)
        │
        ├── If user.notification_prefs.email_digest:
        │   Queue for daily email digest
        │
        └── Future: push notification via service worker
```

---

## 23. Validation Layer

### 23.1 Zod Schema Design Principles

```
1. EVERY API input validated with Zod before business logic
2. Schemas match TypeScript types exactly (z.infer<typeof schema> === Type)
3. Field-type-specific validation uses discriminated unions
4. Filter operators validated against enum (not z.string())
5. Record data validated against tenant's field schema (dynamic)
```

### 23.2 Key Schemas

```typescript
// Field creation — discriminated by type
const fieldSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), label: z.string().min(1).max(100), config: textConfigSchema }),
  z.object({ type: z.literal("select"), label: z.string().min(1).max(100), config: selectConfigSchema }),
  // ... one per field type
]);

// Select config REQUIRES options
const selectConfigSchema = z.object({
  options: z.array(z.object({
    label: z.string().min(1),
    value: z.string().min(1),
    color: z.string().optional(),
  })).min(1, "At least one option required"),
});

// Filter — operator validated as enum
const filterSchema = z.object({
  field_id: z.string().min(1),
  operator: z.enum([
    "is", "is_not", "contains", "not_contains", "starts_with", "ends_with",
    "eq", "neq", "gt", "gte", "lt", "lte", "between",
    "is_any_of", "is_none_of", "contains_any", "contains_all",
    "is_before", "is_after", "is_between", "is_today", "is_this_week",
    "is_this_month", "is_last_7_days", "is_last_30_days",
    "has_file", "has_no_file", "file_count_gt", "file_count_lt", "file_type_is",
    "is_true", "is_false", "is_empty", "is_not_empty",
  ]),
  value: z.unknown(),
});

// Pagination
const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

// Path segment (prevents traversal)
const pathSegmentSchema = z.string().regex(/^[a-zA-Z0-9_-]+$/, "Invalid ID format");
```

---

## 24. Error Handling Strategy

### 24.1 Error Boundary Hierarchy

```
RootLayout
└── GlobalErrorBoundary (error.tsx)
    └── AppProviders
        └── (platform) layout
            └── PageErrorBoundary (per page)
                └── Feature components
                    └── FieldErrorBoundary (per dynamic field)
                        └── DynamicField renderer
```

### 24.2 AppError Class

```typescript
class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status: number = errorStatusMap[code],
    public details?: Record<string, unknown>
  ) {
    super(message);
  }
}

type ErrorCode =
  | "AUTH_REQUIRED"         // 401
  | "AUTH_INVALID"          // 401
  | "PERMISSION_DENIED"    // 403
  | "NOT_FOUND"            // 404
  | "CONFLICT"             // 409
  | "VALIDATION_FAILED"    // 400
  | "RATE_LIMITED"         // 429
  | "LIMIT_REACHED"        // 403
  | "FILE_TOO_LARGE"       // 413
  | "FILE_TYPE_REJECTED"   // 415
  | "INTERNAL_ERROR";      // 500
```

### 24.3 Client-Side Error Handling

```typescript
// React Query global error handler
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry auth errors — redirect to login
        if (error instanceof AppError && error.status === 401) return false;
        // Don't retry permission errors
        if (error instanceof AppError && error.status === 403) return false;
        // Retry network errors up to 2 times
        return failureCount < 2;
      },
    },
  },
});
```

---

## 25. UI & Design System

### 25.1 Typography
- **Font**: Urbanist (Google Fonts)
- **Weights**: 300, 400, 500, 600, 700
- **Loading**: `next/font/google` — zero layout shift
- **Features**: `cv02`, `cv03`, `cv04`, `cv11` (stylistic alternates)

### 25.2 Color System
- CSS custom properties with HSL: `hsl(var(--primary))`
- Dark mode default, theme toggle via `classList`
- Tenant-customizable primary color (from branding)
- Dedicated tokens: `--sidebar`, `--card`, `--popover`, `--destructive`, `--success`

### 25.3 Component Library

```
src/components/ui/
├── button.tsx         # Variants: primary, outline, ghost, destructive, success
├── input.tsx          # With error state + optional icon
├── label.tsx          # With optional required indicator
├── select.tsx         # Single + multi-select with search
├── modal.tsx          # Dialog with title, description, actions
├── card.tsx           # Card, CardHeader, CardContent, CardTitle, CardFooter
├── avatar.tsx         # Image or initials fallback
├── badge.tsx          # Variants: default, secondary, outline, success, destructive, warning
├── dropdown.tsx       # Trigger menu with items
├── switch.tsx         # Toggle
├── textarea.tsx       # Auto-resize multi-line
├── tooltip.tsx        # Hover information
├── tabs.tsx           # Tab navigation
├── skeleton.tsx       # Loading placeholder
├── empty-state.tsx    # Icon + title + description + action
├── confirm-dialog.tsx # Destructive action confirmation
└── data-table.tsx     # TanStack Table wrapper with sort/filter/select
```

### 25.4 Loading States

Every data-dependent component has 3 states:
1. **Loading**: Skeleton placeholders (not spinners) matching content layout
2. **Empty**: EmptyState with icon + description + primary action button
3. **Error**: PageError with error message + retry button

---

## 26. Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ── Helper Functions ──────────────────────────────────────
    function isSignedIn() {
      return request.auth != null;
    }

    function isTenantMember(tenantId) {
      return isSignedIn() &&
        exists(/databases/$(database)/documents/tenants/$(tenantId)/users/$(request.auth.uid));
    }

    function getTenantUser(tenantId) {
      return get(/databases/$(database)/documents/tenants/$(tenantId)/users/$(request.auth.uid)).data;
    }

    function isTenantAdmin(tenantId) {
      return isTenantMember(tenantId) && getTenantUser(tenantId).role == "admin";
    }

    function isTenantManager(tenantId) {
      return isTenantMember(tenantId) && getTenantUser(tenantId).role in ["admin", "manager"];
    }

    // ── Tenant Document ───────────────────────────────────────
    match /tenants/{tenantId} {
      allow read: if isTenantMember(tenantId);
      allow update: if isTenantAdmin(tenantId);
      allow create, delete: if false; // Server-only

      // Users subcollection
      match /users/{userId} {
        allow read: if isTenantMember(tenantId);
        allow update: if isTenantAdmin(tenantId) || request.auth.uid == userId;
        allow create, delete: if false; // Server-only (invites/accept creates users)
      }

      // Records subcollection
      match /records/{recordId} {
        allow read: if isTenantMember(tenantId);
        allow create, update: if isTenantMember(tenantId);
        allow delete: if isTenantManager(tenantId);
      }

      // Fields subcollection
      match /fields/{fieldId} {
        allow read: if isTenantMember(tenantId);
        allow write: if isTenantAdmin(tenantId);
      }

      // Activity subcollection
      match /activity/{activityId} {
        allow read: if isTenantMember(tenantId);
        allow create: if isTenantMember(tenantId);
        allow update, delete: if false; // Immutable
      }

      // Views subcollection
      match /views/{viewId} {
        allow read: if isTenantMember(tenantId);
        allow create, update: if isTenantMember(tenantId);
        allow delete: if isTenantMember(tenantId) &&
          (getTenantUser(tenantId).role in ["admin"] ||
           resource.data.created_by == request.auth.uid);
      }

      // Documents subcollection
      match /documents/{docId} {
        allow read: if isTenantMember(tenantId);
        allow create: if isTenantMember(tenantId);
        allow delete: if isTenantManager(tenantId);
      }

      // Chat rooms
      match /chat_rooms/{roomId} {
        allow read: if isTenantMember(tenantId);
        allow create: if isTenantMember(tenantId);

        match /messages/{msgId} {
          allow read: if isTenantMember(tenantId);
          allow create: if isTenantMember(tenantId);
          allow update: if request.auth.uid == resource.data.sender_id; // Edit own
          allow delete: if isTenantManager(tenantId) ||
            request.auth.uid == resource.data.sender_id;
        }
      }

      // Notifications
      match /notifications/{notifId} {
        allow read: if isTenantMember(tenantId) &&
          resource.data.user_id == request.auth.uid;
        allow update: if request.auth.uid == resource.data.user_id; // Mark as read
        allow create: if false; // Server-only
        allow delete: if request.auth.uid == resource.data.user_id;
      }

      // Templates
      match /templates/{templateId} {
        allow read: if isTenantMember(tenantId);
        allow write: if isTenantManager(tenantId);
      }
    }

    // ── Invites (top-level) ───────────────────────────────────
    match /invites/{inviteId} {
      allow read: if true; // Public — needed for invite acceptance page
      allow write: if false; // Server-only
    }

    // ── Mail (top-level) ──────────────────────────────────────
    match /mail/{mailId} {
      allow read, write: if false; // Server-only (Firebase extension)
    }

    // ── Billing Events (top-level) ────────────────────────────
    match /billing_events/{eventId} {
      allow read, write: if false; // Server-only (Stripe webhook)
    }
  }
}
```

---

## 27. Firestore Indexes

| Collection | Fields | Scope | Used By |
|---|---|---|---|
| `users` | `email` ASC | Collection Group | `/api/auth` — find user across tenants |
| `records` | `meta.deleted` ASC, `meta.created_at` DESC | Collection | Record listing (non-deleted, newest first) |
| `records` | `meta.deleted` ASC, `meta.pipeline_stage` ASC | Collection | Pipeline board queries |
| `records` | `meta.assigned_to` ASC, `meta.deleted` ASC | Collection | "My records" filter |
| `invites` | `email` ASC, `tenant_id` ASC, `status` ASC | Collection | Duplicate invite check |
| `invites` | `tenant_id` ASC, `status` ASC | Collection | Pending invites for tenant |
| `activity` | `timestamp` DESC | Collection | Audit log viewer |
| `activity` | `action` ASC, `timestamp` DESC | Collection | Filtered audit logs |
| `notifications` | `user_id` ASC, `read` ASC, `created_at` DESC | Collection | Unread notifications |
| `chat_rooms` | `participants` ARRAY_CONTAINS, `last_message_at` DESC | Collection | User's chat rooms |
| `messages` | `created_at` ASC | Collection | Message thread ordering |

---

## 28. Environment Variables

```bash
# ──────────────────────────────────────────────────────────────
# Firebase Client SDK (PUBLIC — embedded in browser bundle)
# ──────────────────────────────────────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# ──────────────────────────────────────────────────────────────
# Firebase Admin SDK (SERVER ONLY — never exposed to client)
# ──────────────────────────────────────────────────────────────
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=              # PEM format with \n

# ──────────────────────────────────────────────────────────────
# App Configuration
# ──────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://crm.whatstask.com
NEXT_PUBLIC_APP_NAME=CRM WhatsTask

# ──────────────────────────────────────────────────────────────
# Stripe (Billing)
# ──────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=                       # Server only
STRIPE_WEBHOOK_SECRET=                   # Server only
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=      # Client

# ──────────────────────────────────────────────────────────────
# WhatsApp Business API
# ──────────────────────────────────────────────────────────────
WHATSAPP_ACCESS_TOKEN=                   # Server only
WHATSAPP_VERIFY_TOKEN=                   # Webhook verification
WHATSAPP_PHONE_NUMBER_ID=               # Default sender

# ──────────────────────────────────────────────────────────────
# Security (never commit .env files — use Vercel dashboard)
# ──────────────────────────────────────────────────────────────
# NEVER store credentials in code, git, or chat
# Rotate keys immediately if exposed
# Use Vercel environment variables for all secrets
```

---

## 29. Deployment & Infrastructure

### 29.1 Vercel Configuration

```
Framework:        Next.js 15 (App Router)
Build command:    next build
Output:           .next/
Node version:     20.x
Region:           Auto (edge-optimized)
```

### 29.2 Headers (next.config.ts)

```typescript
headers: [
  {
    source: "/(.*)",
    headers: [
      { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" }, // Google OAuth
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ],
  },
];
```

### 29.3 Remote Images

```typescript
images: {
  remotePatterns: [
    { protocol: "https", hostname: "firebasestorage.googleapis.com" },
    { protocol: "https", hostname: "lh3.googleusercontent.com" }, // Google avatars
  ],
},
```

---

## 30. Navigation Map

```
PUBLIC ROUTES (no auth required)
──────────────────────────────────────────────
/                          → redirects to /login
/login                     → Google OAuth sign-in
/signup                    → redirects to /login
/forgot-password           → password recovery
/invite/[token]            → accept team invitation

ONBOARDING (auth required, no tenant)
──────────────────────────────────────────────
/onboarding                → 4-step workspace setup

PLATFORM (auth + tenant required)
──────────────────────────────────────────────
/dashboard                 → stats overview + recent activity
/records                   → record table + CRUD + filters
/records/[id]              → record detail + edit + activity
/pipeline                  → kanban board (drag-and-drop stages)
/chat                      → messaging (team + record + direct)
/employees                 → team list + invite management
/activity                  → audit log viewer + filters
/templates                 → document templates + PDF generation

/settings/general          → company name, record labels
/settings/fields           → custom field builder
/settings/branding         → logo, colors, theme
/settings/roles            → custom role editor (Professional+)
/settings/billing          → subscription + usage + invoices

SUPER ADMIN (platform owner only)
──────────────────────────────────────────────
/super-admin/tenants       → tenant management
/super-admin/subscriptions → revenue dashboard
/super-admin/analytics     → usage analytics
```

---

## 31. Feature Status & Roadmap

| Feature | Status | Phase |
|---|---|---|
| Google OAuth login | ✅ Built | — |
| Onboarding wizard | ✅ Built | — |
| Multi-tenant data model | ✅ Built | — |
| Auth provider + routing | ✅ Built (needs hardening) | Phase 1 |
| Invite flow (create + accept) | ✅ Built | — |
| Custom field system (12 types) | ✅ Built (needs discriminated union) | Phase 1 |
| Record CRUD | ✅ Built (needs auth middleware) | Phase 1 |
| Filter engine (30+ operators) | ✅ Built (needs error handling) | Phase 1 |
| Saved views | ✅ Built (client-side → server) | Phase 2 |
| Audit logging | ✅ Built (needs shared utility) | Phase 1 |
| Role-based permissions | ✅ Built (needs UI enforcement) | Phase 2 |
| Team management | ✅ Built | — |
| Dark/light theme | ✅ Built | — |
| White-label branding | ✅ Built | — |
| Firestore security rules | ✅ Built | — |
| Record export | ✅ Built (data only) | — |
| API auth middleware (withAuth) | 🔴 Critical — must build | Phase 1 |
| Input validation (Zod on API) | 🔴 Critical — must build | Phase 1 |
| React Query migration | 🟡 High priority | Phase 2 |
| Error boundaries | 🟡 High priority | Phase 2 |
| UI permission guards (<Can>) | 🟡 High priority | Phase 2 |
| Real-time Firestore listeners | 🟡 High priority | Phase 2 |
| Pipeline / Kanban | 🔲 Not started | Phase 3 |
| Chat / Messaging | 🔲 Not started | Phase 3 |
| Document templates | 🔲 Not started | Phase 4 |
| PDF generation | 🔲 Not started | Phase 4 |
| Billing / Subscriptions (Stripe) | 🔲 Not started | Phase 4 |
| Custom roles editor | 🔲 Not started | Phase 5 |
| WhatsApp integration | 🔲 Not started | Phase 5 |
| Notification system | 🔲 Not started | Phase 3 |
| Super-admin dashboard | 🔲 Not started | Phase 5 |

---

## 32. Implementation Phases

### Phase 1 — Security Hardening (Week 1-2)
**Goal**: Make the existing system production-safe

- [ ] Build `withAuth()` middleware — token verification on every API route
- [ ] Build `withValidation()` — Zod validation on every mutation
- [ ] Refactor all 9 API routes to use middleware (eliminate header trust)
- [ ] Build shared `createAuditLog()` utility
- [ ] Build shared `AppError` class + consistent response envelope
- [ ] Add input sanitization (`sanitize.ts`)
- [ ] Add file upload validation (size, type, path traversal)
- [ ] Fix AuthProvider race conditions (AbortController, request generation)
- [ ] Add error state to auth flow (no more infinite spinners)
- [ ] Implement discriminated union for `FieldConfig`

### Phase 2 — Data Layer & UX (Week 3-4)
**Goal**: Reliable state management + permission-aware UI

- [ ] Migrate server state from Zustand to React Query
- [ ] Restructure Zustand for client-only UI state
- [ ] Add `<Can>` component and `usePermission()` hook
- [ ] Gate all UI actions behind permission checks
- [ ] Add error boundaries (global, page, field level)
- [ ] Add skeleton loading states (replace spinners)
- [ ] Migrate saved views to server (Firestore subcollection)
- [ ] Add Firestore `onSnapshot` listeners for records, fields, tenant
- [ ] Wire real-time updates through React Query cache

### Phase 3 — Core Features (Week 5-8)
**Goal**: Pipeline, chat, and notifications

- [ ] Build pipeline/kanban board with drag-and-drop
- [ ] Pipeline stage configuration (admin settings)
- [ ] Build chat system (rooms, messages, real-time)
- [ ] Record-linked chat rooms
- [ ] Build notification system (in-app + notification bell)
- [ ] @mention support in chat → notification trigger
- [ ] Record assignment + "My Records" view

### Phase 4 — Documents & Billing (Week 9-12)
**Goal**: Revenue generation + document automation

- [ ] Build template editor (HTML with field placeholders)
- [ ] PDF generation from templates
- [ ] Stripe integration (Checkout + webhooks)
- [ ] Plan tiers with limit enforcement
- [ ] Billing settings page (current plan, usage, invoices)
- [ ] Upgrade/downgrade flow
- [ ] Usage limit warnings (80% threshold notifications)

### Phase 5 — Advanced Features (Week 13-16)
**Goal**: Enterprise features + WhatsApp

- [ ] WhatsApp Business API integration
- [ ] WhatsApp message templates (Meta-approved)
- [ ] Two-way WhatsApp conversations linked to records
- [ ] Custom role editor (granular permission overrides)
- [ ] Super-admin dashboard (tenant management, analytics, revenue)
- [ ] API access for Professional+ plans
- [ ] Email digest notifications

---

*This architecture document is the single source of truth for CRM WhatsTask system design. All implementation decisions must align with the principles, patterns, and contracts defined here. Update this document when architecture evolves.*
