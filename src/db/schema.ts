import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  index,
  unique,
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
  limits: jsonb("limits")
    .$type<{ max_records: number; max_users: number; max_fields: number; max_storage_mb: number }>()
    .default({ max_records: -1, max_users: 3, max_fields: 10, max_storage_mb: 500 }),
  usage: jsonb("usage")
    .$type<{ record_count: number; user_count: number; field_count: number; storage_used_mb: number }>()
    .default({ record_count: 0, user_count: 1, field_count: 0, storage_used_mb: 0 }),
  pipelineConfig: jsonb("pipeline_config")
    .$type<{ enabled: boolean; stages: { id: string; name: string; color: string; order: number }[] }>()
    .default({ enabled: false, stages: [] }),
  whatsappConfig: jsonb("whatsapp_config")
    .$type<{ enabled: boolean; phone_number_id?: string; access_token?: string }>()
    .default({ enabled: false }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").default("free"),
  trialEndDate: timestamp("trial_end_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  createdBy: text("created_by").notNull(), // Supabase Auth user ID
});

// ── USERS ──────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    authUid: text("auth_uid").notNull(), // Supabase Auth user ID
    email: text("email").notNull(),
    name: text("name").notNull(),
    avatarUrl: text("avatar_url"),
    role: text("role").notNull().default("employee"),
    status: text("status").default("active"),
    permissions: jsonb("permissions").$type<Record<string, boolean>>().notNull(),
    notificationPrefs: jsonb("notification_prefs")
      .$type<{ email_digest: boolean; record_assigned: boolean; chat_mentions: boolean }>()
      .default({ email_digest: false, record_assigned: true, chat_mentions: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    lastActive: timestamp("last_active", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("users_tenant_email").on(table.tenantId, table.email),
    unique("users_tenant_auth_uid").on(table.tenantId, table.authUid),
    index("idx_users_tenant").on(table.tenantId),
    index("idx_users_auth_uid").on(table.authUid),
    index("idx_users_email").on(table.email),
  ]
);

// ── FIELDS ──────────────────────────────────────────

export const fields = pgTable(
  "fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    type: text("type").notNull(), // text, textarea, number, phone, email, date, select, multi_select, file, url, currency, boolean
    fieldOrder: integer("field_order").notNull(),
    required: boolean("required").default(false),
    sensitive: boolean("sensitive").default(false),
    filterable: boolean("filterable").default(true),
    searchable: boolean("searchable").default(true),
    showInTable: boolean("show_in_table").default(true),
    config: jsonb("config").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    createdBy: text("created_by").notNull(),
  },
  (table) => [
    unique("fields_tenant_order").on(table.tenantId, table.fieldOrder),
    index("idx_fields_tenant").on(table.tenantId, table.fieldOrder),
  ]
);

// ── RECORDS ──────────────────────────────────────────

export const records = pgTable(
  "records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
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
  },
  (table) => [
    index("idx_records_tenant_active").on(table.tenantId, table.createdAt),
    index("idx_records_pipeline").on(table.tenantId, table.pipelineStage, table.createdAt),
    index("idx_records_assigned").on(table.tenantId, table.assignedTo, table.createdAt),
    index("idx_records_data").on(table.data),
    index("idx_records_tags").on(table.tags),
  ]
);

// ── ACTIVITY / AUDIT LOG ──────────────────────────────

export const activity = pgTable(
  "activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    userName: text("user_name").notNull(),
    userRole: text("user_role").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    entityName: text("entity_name"),
    changes: jsonb("changes").$type<Record<string, { old: unknown; new: unknown }>>(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_activity_tenant").on(table.tenantId, table.createdAt),
    index("idx_activity_action").on(table.tenantId, table.action, table.createdAt),
  ]
);

// ── INVITES ──────────────────────────────────────────

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
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
  },
  (table) => [
    index("idx_invites_email").on(table.email, table.tenantId, table.status),
    index("idx_invites_tenant").on(table.tenantId, table.status),
  ]
);

// ── SAVED VIEWS ──────────────────────────────────────

export const savedViews = pgTable(
  "saved_views",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    filters: jsonb("filters")
      .$type<{ match: "all" | "any"; filters: unknown[] }>()
      .notNull()
      .default({ match: "all", filters: [] }),
    sort: jsonb("sort").$type<unknown[]>().default([]),
    columns: jsonb("columns").$type<string[]>().default([]),
    shared: boolean("shared").default(false),
    pinned: boolean("pinned").default(false),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_views_tenant").on(table.tenantId)]
);

// ── CHAT ──────────────────────────────────────────

export const chatRooms = pgTable(
  "chat_rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // record, team, direct
    name: text("name"),
    recordId: uuid("record_id").references(() => records.id, { onDelete: "set null" }),
    participants: text("participants").array().notNull(),
    isPublic: boolean("is_public").default(false),
    createdBy: text("created_by"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_chat_rooms_tenant").on(table.tenantId)]
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => chatRooms.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    senderId: text("sender_id").notNull(),
    senderName: text("sender_name").notNull(),
    content: text("content").notNull(),
    attachments: jsonb("attachments").$type<{ name: string; url: string; type: string }[]>().default([]),
    readBy: text("read_by").array().default([]),
    edited: boolean("edited").default(false),
    deleted: boolean("deleted").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_messages_room").on(table.roomId, table.createdAt)]
);

// ── NOTIFICATIONS ──────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    read: boolean("read").default(false),
    actorId: text("actor_id"),
    actorName: text("actor_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_notifications_user").on(table.userId, table.read, table.createdAt)]
);

// ── TEMPLATES ──────────────────────────────────────

export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  content: text("content").notNull(),
  fieldMappings: jsonb("field_mappings").$type<Record<string, string>>().notNull().default({}),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ── BILLING EVENTS ──────────────────────────────────

export const billingEvents = pgTable("billing_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  stripeEventId: text("stripe_event_id").unique().notNull(),
  type: text("type").notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  data: jsonb("data").$type<Record<string, unknown>>(),
  processed: boolean("processed").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
