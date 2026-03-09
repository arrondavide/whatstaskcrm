# CRM WhatsTask — System Architecture & Design

## 1. Project Overview

**CRM WhatsTask** is a multi-tenant, white-label CRM SaaS platform built for service businesses (manpower agencies, real estate, sales teams, HR departments). Each tenant gets a fully branded workspace with customizable records, team management, audit logging, and document templating.

**Production URL**: `https://crm.whatstask.com`

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Next.js 15 (App Router) |
| State Management | Zustand 5.0 |
| Database | Firebase Firestore |
| Auth | Firebase Authentication (Google OAuth) |
| File Storage | Firebase Storage |
| Styling | Tailwind CSS 3.4, Custom Shadcn-style components, Urbanist font |
| Validation | Zod 3.24 |
| Tables | TanStack React Table 8.21 |
| Icons | Lucide React |
| Dates | date-fns 4.1 |
| Notifications | react-hot-toast |
| File Upload | react-dropzone |
| Language | TypeScript 5.7 |
| Deployment | Vercel |

---

## 2. Folder Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (AuthProvider + Toaster)
│   ├── page.tsx                  # Redirects to /login
│   ├── (auth)/                   # Public auth pages
│   │   ├── login/page.tsx        # Google OAuth login
│   │   ├── signup/page.tsx       # Redirects to /login
│   │   ├── invite/[token]/page.tsx  # Invite acceptance
│   │   ├── forgot-password/page.tsx
│   │   └── layout.tsx            # Centered card layout
│   ├── (platform)/               # Protected app pages
│   │   ├── layout.tsx            # Sidebar + Topbar shell
│   │   ├── dashboard/page.tsx    # Stats + recent activity
│   │   ├── records/page.tsx      # Record table + CRUD
│   │   ├── records/[id]/page.tsx # Record detail view
│   │   ├── pipeline/page.tsx     # Kanban board (placeholder)
│   │   ├── chat/page.tsx         # Messaging (placeholder)
│   │   ├── employees/page.tsx    # Team management + invites
│   │   ├── activity/page.tsx     # Audit log viewer
│   │   ├── templates/page.tsx    # Doc templates (placeholder)
│   │   └── settings/
│   │       ├── general/page.tsx  # Company name, labels
│   │       ├── fields/page.tsx   # Custom field builder
│   │       ├── branding/page.tsx # Logo, colors, theme
│   │       ├── roles/page.tsx    # Custom roles (placeholder)
│   │       └── billing/page.tsx  # Subscription (placeholder)
│   ├── onboarding/page.tsx       # Setup wizard (new users)
│   ├── super-admin/              # Platform admin pages
│   │   ├── tenants/page.tsx
│   │   ├── subscriptions/page.tsx
│   │   └── analytics/page.tsx
│   └── api/                      # Server-side API routes
│       ├── auth/route.ts         # Session verification
│       ├── onboarding/route.ts   # Workspace creation
│       ├── invites/route.ts      # Create & validate invites
│       ├── invites/accept/route.ts  # Accept invite
│       ├── records/route.ts      # CRUD records
│       ├── fields/route.ts       # CRUD fields
│       ├── audit/route.ts        # Fetch audit logs
│       ├── export/route.ts       # Export records
│       └── tenants/route.ts      # Tenant management
├── components/
│   ├── providers/
│   │   └── auth-provider.tsx     # Auth state + routing logic
│   ├── layout/
│   │   ├── shell.tsx             # Page header wrapper
│   │   ├── sidebar.tsx           # Navigation sidebar
│   │   └── topbar.tsx            # Top bar (search, theme, user)
│   ├── records/
│   │   ├── record-form.tsx       # Dynamic form from fields
│   │   ├── record-table.tsx      # Data table with filters
│   │   └── dynamic-field.tsx     # Field type renderers
│   ├── filters/
│   │   ├── filter-builder.tsx    # AND/OR filter UI
│   │   └── saved-views.tsx       # Save/load filter views
│   ├── onboarding/
│   │   └── setup-wizard.tsx      # 4-step onboarding wizard
│   ├── files/
│   │   └── file-upload.tsx       # Dropzone file upload
│   └── ui/                       # Reusable UI components
│       ├── button.tsx, input.tsx, modal.tsx, card.tsx
│       ├── select.tsx, avatar.tsx, badge.tsx, dropdown.tsx
│       ├── switch.tsx, tooltip.tsx, label.tsx, textarea.tsx
│       ├── empty-state.tsx, tabs.tsx
│       └── ...
├── lib/
│   └── firebase/
│       ├── client.ts             # Client SDK (auth, db, storage)
│       ├── admin.ts              # Admin SDK (lazy-init singleton)
│       └── storage.ts            # File upload/delete utilities
├── stores/
│   ├── auth-store.ts             # User state
│   ├── tenant-store.ts           # Tenant + fields state
│   ├── record-store.ts           # Records, filters, views, search
│   └── notification-store.ts     # Notifications + unread count
├── types/
│   ├── index.ts                  # Re-exports
│   ├── tenant.ts, user.ts, record.ts, field.ts
│   ├── audit.ts, chat.ts, filter.ts
│   ├── notification.ts, permissions.ts
│   └── ...
├── utils/
│   ├── filter-engine.ts          # Filter evaluation logic
│   ├── format.ts                 # Date/file size/initials helpers
│   └── cn.ts                     # Tailwind class merge utility
└── validators/
    ├── auth.schema.ts, field.schema.ts
    ├── filter.schema.ts, record.schema.ts
    └── ...
```

---

## 3. Authentication Flow

```
┌──────────────┐     signInWithPopup      ┌──────────────────┐
│  /login      │ ──────────────────────▶  │  Firebase Auth    │
│  (Google     │                          │  (Google OAuth)   │
│   OAuth)     │ ◀──────────────────────  │                   │
└──────────────┘     onAuthStateChanged   └──────────────────┘
       │                                           │
       ▼                                           │
┌──────────────┐     POST /api/auth               │
│ AuthProvider │ ──────────────────────▶  ┌────────▼─────────┐
│ (client)     │     { token }           │  API Route        │
│              │                          │  (server)         │
│              │ ◀──────────────────────  │                   │
└──────────────┘     { user, tenant }    │  1. verifyIdToken │
       │             or 404 (new user)    │  2. query users   │
       │                                  │  3. get tenant    │
       ▼                                  └───────────────────┘
  ┌─────────────────────────────┐
  │  Routing Decision:          │
  │                             │
  │  200 → /dashboard           │
  │  404 → /onboarding          │
  │  401 → /login (error)       │
  │  500 → /login (config err)  │
  └─────────────────────────────┘
```

### Auth States

| State | Firebase Auth | Firestore User | Route |
|---|---|---|---|
| Not signed in | No user | — | `/login` |
| Signed in, new | Has user | Not found (404) | `/onboarding` |
| Signed in, existing | Has user | Found (200) | `/dashboard` |
| Suspended | Has user | Found, suspended | Error (403) |

### AuthProvider Responsibilities
- Listens to `onAuthStateChanged` (Firebase client SDK)
- Calls `POST /api/auth` with Firebase ID token
- Updates Zustand stores (`auth-store`, `tenant-store`)
- Routes user to correct page based on API response
- Shows loading spinner until `ready = true`
- Provides `AuthContext` (firebaseUser, isNewUser, ready)

---

## 4. Onboarding Flow

```
┌──────────────────────────────────────────────────────────┐
│                    /onboarding                            │
│                                                          │
│  Step 1: Company           Step 2: Branding              │
│  ┌──────────────────┐      ┌──────────────────┐         │
│  │ Company name     │      │ Brand color      │         │
│  │ Industry preset  │ ───▶ │ Theme (dark/     │         │
│  │ Record labels    │      │        light)    │         │
│  └──────────────────┘      └──────────────────┘         │
│                                    │                     │
│  Step 3: Team              Step 4: Summary               │
│  ┌──────────────────┐      ┌──────────────────┐         │
│  │ Invite emails    │      │ Review all       │         │
│  │ (optional)       │ ───▶ │ Launch workspace │         │
│  │                  │      │                  │         │
│  └──────────────────┘      └──────────────────┘         │
└──────────────────────────────────────────────────────────┘
                         │
                         ▼
              POST /api/onboarding
              {token, companyName, primaryColor,
               theme, recordLabel, inviteEmails}
                         │
                         ▼
              ┌──────────────────────┐
              │ Creates in Firestore │
              │ • tenants/{id}       │
              │ • tenants/{id}/      │
              │   users/{uid}        │
              │ • invites/{id}...    │
              │ • mail/{id}...       │
              └──────────────────────┘
                         │
                         ▼
                    /dashboard
```

---

## 5. Multi-Tenant Firestore Data Model

```
firestore/
│
├── tenants/{tenantId}
│   ├── branding
│   │   ├── name: string              # "Acme Corp"
│   │   ├── logo_url: string | null
│   │   ├── primary_color: string     # "#7C3AED"
│   │   └── theme: "dark" | "light"
│   ├── subscription
│   │   ├── status: "free" | "active" | "suspended"
│   │   ├── plan_id?: string
│   │   ├── trial_end_date?: string
│   │   └── billing_email?: string
│   ├── record_label: string           # "Candidates"
│   ├── record_label_singular: string  # "Candidate"
│   ├── document_label: string         # "Certificates"
│   ├── created_at: string
│   └── created_by: string
│
│   └── /users/{userId}
│       ├── email: string
│       ├── name: string
│       ├── avatar_url: string | null
│       ├── role: "admin" | "manager" | "employee" | "viewer"
│       ├── status: "active" | "invited" | "suspended"
│       ├── permissions: UserPermissions
│       ├── created_at: string
│       └── last_active: string
│
│   └── /records/{recordId}
│       ├── tenant_id: string
│       ├── data: { [fieldId]: value }   # Dynamic field values
│       └── meta
│           ├── created_by, created_at
│           ├── updated_by, updated_at
│           ├── deleted: boolean
│           ├── deleted_by?, deleted_at?
│           ├── version: number
│           └── pipeline_stage?: string
│
│   └── /fields/{fieldId}
│       ├── label: string
│       ├── type: FieldType              # 12 types supported
│       ├── order: number
│       ├── required: boolean
│       ├── sensitive: boolean           # Excluded from exports
│       ├── filterable: boolean
│       ├── searchable: boolean
│       ├── show_in_table: boolean
│       ├── config: FieldConfig          # Type-specific options
│       ├── created_at: string
│       └── created_by: string
│
│   └── /activity/{activityId}
│       ├── timestamp: string
│       ├── user_id, user_name, user_role
│       ├── action: AuditAction          # 22 action types
│       ├── entity_type, entity_id, entity_name
│       ├── changes?: AuditChange[]
│       └── snapshot?: object            # For deletes
│
│   └── /documents/{docId}               # File references
│
├── invites/{inviteId}
│   ├── tenant_id, tenant_name
│   ├── email, role
│   ├── invited_by, invited_by_name
│   ├── status: "pending" | "accepted"
│   ├── created_at
│   └── accepted_at?, accepted_by?
│
└── mail/{mailId}                        # Firebase Trigger Email extension
    ├── to: string
    └── message: { subject, html }
```

### Tenant Isolation

All user data is scoped under `tenants/{tenantId}/`. Isolation is enforced at three levels:

1. **Firestore Rules**: Every read/write checks `isTenantMember()` — the requesting user must exist in `tenants/{tenantId}/users/{uid}`
2. **API Layer**: All API routes verify the user's tenant_id from their token
3. **Client State**: Zustand `tenant-store` holds a single tenant context per session

---

## 6. API Routes

### `POST /api/auth` — Session Verification
Verifies Firebase ID token, finds user across tenants by email (collection group query), returns user + tenant + fields data. Returns 404 for new users (triggers onboarding).

### `POST /api/onboarding` — Workspace Creation
Creates tenant document, admin user, and invite documents in a batch write. Triggers invite emails via the `mail` collection.

### `POST /api/invites` — Create Invite
Validates requester permissions, checks for existing member/invite, creates invite doc, sends email.

### `GET /api/invites?id={id}` — Validate Invite
Returns invite details (tenant name, role, inviter) for the invite acceptance page.

### `POST /api/invites/accept` — Accept Invite
Verifies invite is pending, email matches, creates user under tenant, marks invite accepted.

### `GET /api/records` — List Records
Fetches non-deleted records for a tenant, ordered by created_at descending.

### `POST /api/records` — Create Record
Creates record with audit log entry (RECORD_CREATED).

### `GET /api/fields` — List Fields
Fetches fields ordered by `order` field.

### `POST /api/fields` — Create Field
Creates field with audit log entry (FIELD_CREATED).

### `GET /api/audit` — Audit Logs
Fetches audit logs with optional action filter, ordered by timestamp descending.

### `POST /api/export` — Export Record
Generates export data (excluding sensitive fields), logs CERTIFICATE_EXPORTED action.

---

## 7. Role-Based Access Control

### Roles & Permissions

```
                  admin    manager   employee   viewer
Records
  create            ✓         ✓         ✓         ✗
  read              ✓         ✓         ✓         ✓
  update            ✓         ✓         ✓         ✗
  delete            ✓         ✓         ✗         ✗
  export            ✓         ✓         ✓         ✗
  view_sensitive    ✓         ✗         ✗         ✗

Team
  invite            ✓         ✓         ✗         ✗
  remove            ✓         ✗         ✗         ✗
  change_role       ✓         ✗         ✗         ✗
  view_activity     ✓         ✓         ✗         ✗

Chat
  send              ✓         ✓         ✓         ✗
  delete_own        ✓         ✓         ✗         ✗
  view_logs         ✓         ✗         ✗         ✗

Settings
  edit_fields       ✓         ✗         ✗         ✗
  edit_branding     ✓         ✗         ✗         ✗
  edit_templates    ✓         ✓         ✗         ✗
  manage_views      ✓         ✓         ✓         ✗
```

---

## 8. Custom Field System

### Supported Field Types (12)

| Type | Input | Config Options |
|---|---|---|
| `text` | Text input | max_length, placeholder |
| `textarea` | Multi-line | max_length, placeholder |
| `number` | Number input | min, max, precision |
| `phone` | Phone input | placeholder |
| `email` | Email input | placeholder |
| `date` | Date picker | include_time |
| `select` | Dropdown | options[] with label + color |
| `multi_select` | Multi-dropdown | options[] with label + color |
| `file` | Dropzone upload | accept[], multiple, max_size_mb |
| `url` | URL input | open_in_new_tab |
| `currency` | Currency input | currency code, min, max, precision |
| `boolean` | Toggle switch | — |

### Field Properties
- **required**: Validates on form submission
- **sensitive**: Excluded from exports, access logged
- **filterable**: Available in filter builder
- **searchable**: Included in text search
- **show_in_table**: Visible as table column

---

## 9. Filter & Search Engine

```
┌─────────────────────────────────────────┐
│          FilterGroup                     │
│  match: "all" (AND) | "any" (OR)       │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Filter 1: name contains "John" │    │
│  │ Filter 2: status is "Active"   │    │
│  │ Filter 3: date is_after "2024" │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
            │
            ▼
   applyFilters(records, filterGroup, fields)
            │
            ▼
   Filtered records rendered in RecordTable
```

### Operators by Field Type

- **Text/Textarea**: is, is_not, contains, not_contains, starts_with, ends_with, is_empty, is_not_empty
- **Number/Currency**: eq, neq, gt, gte, lt, lte, between, is_empty, is_not_empty
- **Select**: is, is_not, is_any_of, is_none_of, is_empty, is_not_empty
- **Multi-select**: contains, not_contains, contains_any, contains_all, is_empty, is_not_empty
- **Date**: is, is_before, is_after, is_between, is_today, is_this_week, is_this_month, is_last_7_days, is_last_30_days, is_empty, is_not_empty
- **File**: has_file, has_no_file, file_count_gt, file_count_lt
- **Boolean**: is_true, is_false

### Saved Views
Users can save filter + sort configurations as named views and switch between them.

---

## 10. Invite & Team Flow

```
Admin/Manager
    │
    ▼
POST /api/invites
{ email, role }
    │
    ├──▶ Creates invites/{id} doc (status: "pending")
    └──▶ Creates mail/{id} doc (triggers email)
              │
              ▼
         Recipient clicks link
         /invite/{inviteId}
              │
              ▼
         Signs in with Google
              │
              ▼
         POST /api/invites/accept
         { token, inviteId }
              │
              ├──▶ Creates tenants/{tid}/users/{uid}
              └──▶ Updates invite status → "accepted"
                        │
                        ▼
                   AuthProvider picks up
                   new user → /dashboard
```

---

## 11. State Management (Zustand)

### auth-store
```typescript
{
  user: User | null,        // Current user data
  loading: boolean,         // Auth loading state
  setUser(), setLoading(), logout()
}
```

### tenant-store
```typescript
{
  tenant: Tenant | null,    // Current tenant
  fields: Field[],          // Tenant's custom fields (sorted by order)
  loading: boolean,
  setTenant(), setFields(), addField(), updateField(), removeField()
}
```

### record-store
```typescript
{
  records: CrmRecord[],     // All records
  loading: boolean,
  selectedIds: string[],    // Multi-select
  activeFilters: FilterGroup,
  activeSort: SortConfig[],
  activeView: SavedView | null,
  savedViews: SavedView[],
  searchQuery: string,
  // ... setters, toggleSelected(), selectAll(), clearSelection()
}
```

### notification-store
```typescript
{
  notifications: Notification[],
  unreadCount: number,
  setNotifications(), addNotification(), markAsRead(), markAllAsRead()
}
```

---

## 12. Data Flow Architecture

```
┌─────────────┐    ┌──────────────┐    ┌──────────────────┐
│   Browser    │    │  Next.js     │    │   Firebase       │
│   (React)    │    │  API Routes  │    │   (Firestore)    │
│              │    │  (Server)    │    │                  │
│  Components  │───▶│  Admin SDK   │───▶│  tenants/{id}/   │
│  + Stores    │◀───│  verifyToken │◀───│  users, records, │
│  + Filters   │    │  CRUD ops    │    │  fields, etc.    │
│              │    │  Audit logs  │    │                  │
└─────────────┘    └──────────────┘    └──────────────────┘
       │                                        │
       │           ┌──────────────┐             │
       └──────────▶│  Firebase    │◀────────────┘
                   │  Auth        │
                   │  (Google     │
                   │   OAuth)     │
                   └──────────────┘
```

### Request Lifecycle
1. User action in component
2. API call (`fetch` to `/api/*`)
3. Firebase Admin SDK processes (token verify + Firestore ops)
4. Firestore update + audit log write
5. API response
6. Zustand store update
7. React re-render
8. Toast notification (success/error)

---

## 13. Firestore Security Rules Summary

```javascript
// Core helper functions
isTenantMember(tenantId)   // user exists in tenants/{id}/users/{uid}
isTenantAdmin(tenantId)    // user role == "admin"
isTenantManager(tenantId)  // user role in ["admin", "manager"]

// Key rules
tenants/{id}          → read: member, write: admin
tenants/{id}/users    → read: member, update own or admin, create/delete: admin
tenants/{id}/records  → read: member, create/update: member, delete: manager
tenants/{id}/fields   → read: member, write: admin
tenants/{id}/activity → read: member, create: member
invites/{id}          → read: public (for validation), write: server-only
mail/{id}             → server-only (Firebase extension)
```

---

## 14. Required Firestore Indexes

| Collection | Fields | Scope |
|---|---|---|
| `users` | `email` ASC | Collection Group |
| `records` | `status` ASC, `created_at` DESC | Collection |
| `invites` | `email` ASC, `tenant_id` ASC, `status` ASC | Collection |
| `activity` | `created_at` DESC | Collection |

The **collection group index on `users.email`** is critical — it's used by `/api/auth` to find users across all tenants.

---

## 15. Environment Variables

```bash
# Firebase Client SDK (PUBLIC — embedded in browser bundle)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin SDK (SERVER ONLY — never exposed to client)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=     # PEM format with \n for newlines

# App Configuration
NEXT_PUBLIC_APP_URL=https://crm.whatstask.com
NEXT_PUBLIC_APP_NAME=CRM WhatsTask
```

---

## 16. UI & Design System

### Typography
- **Font**: [Urbanist](https://fonts.google.com/specimen/Urbanist) (Google Fonts)
- **Weights**: 300 (Light), 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)
- **Loading**: `next/font/google` with `subsets: ["latin"]` — auto-optimized, no layout shift
- **Features**: `cv02`, `cv03`, `cv04`, `cv11` (stylistic alternates enabled in globals.css)
- **Letter spacing**: Tighter tracking for Urbanist's natural width

### Color System
- CSS custom properties with HSL values (`hsl(var(--primary))`)
- Dark mode default (`<html className="dark">`)
- Theme toggle via `document.documentElement.classList`
- Key colors: primary (purple #7C3AED), destructive (red), success (green), warning (yellow)
- Sidebar, card, popover each have dedicated color tokens

### Component Library
- Custom Shadcn-inspired components in `/src/components/ui/`
- Consistent border radius via `--radius` CSS variable
- Animations: fade-in, slide-in-left, slide-in-right
- Toast notifications via `react-hot-toast` (top-right, themed to match card style)

---

## 17. Deployment (Vercel)

- **Framework**: Next.js 15 with App Router
- **Build**: `next build` (automatic on Vercel)
- **Headers**: `Cross-Origin-Opener-Policy: same-origin-allow-popups` (for Google OAuth popup)
- **Remote Images**: Firebase Storage domain allowed (`firebasestorage.googleapis.com`)
- **Environment Variables**: Must be set in Vercel dashboard (especially Admin SDK credentials)

---

## 18. Navigation Map

```
/                          → redirects to /login
/login                     → Google OAuth sign-in
/signup                    → redirects to /login
/forgot-password           → password recovery
/invite/[token]            → accept team invitation
/onboarding                → 4-step workspace setup (new users only)

/dashboard                 → stats overview + recent activity
/records                   → record table with filters + CRUD
/records/[id]              → record detail view
/pipeline                  → kanban board (placeholder)
/chat                      → messaging (placeholder)
/employees                 → team list + invite management
/activity                  → audit log viewer
/templates                 → document templates (placeholder)

/settings/general          → company name, record labels
/settings/fields           → custom field builder
/settings/branding         → logo, colors, theme
/settings/roles            → custom roles (placeholder)
/settings/billing          → subscription management (placeholder)

/super-admin/tenants       → platform tenant management
/super-admin/subscriptions → subscription overview
/super-admin/analytics     → usage analytics
```

---

## 19. Features Status

| Feature | Status |
|---|---|
| Google OAuth login | ✅ Built |
| Onboarding wizard | ✅ Built |
| Multi-tenant data model | ✅ Built |
| Auth provider + routing | ✅ Built |
| Invite flow (create + accept) | ✅ Built |
| Custom field system (12 types) | ✅ Built |
| Record CRUD | ✅ Built (API + UI) |
| Filter engine (30+ operators) | ✅ Built |
| Saved views | ✅ Built (client-side) |
| Audit logging | ✅ Built |
| Role-based permissions | ✅ Built |
| Team management | ✅ Built |
| Dark/light theme | ✅ Built |
| White-label branding | ✅ Built |
| Firestore security rules | ✅ Built |
| Record export | ✅ Built (data only) |
| Pipeline / Kanban | 🔲 Placeholder |
| Chat / Messaging | 🔲 Placeholder |
| Document templates | 🔲 Placeholder |
| PDF generation | 🔲 Placeholder |
| Custom roles editor | 🔲 Placeholder |
| Billing / Subscriptions | 🔲 Placeholder |
| Real-time sync (listeners) | 🔲 Not started |
| WhatsApp integration | 🔲 Not started |
