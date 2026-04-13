CREATE TABLE "activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"user_role" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"entity_name" text,
	"changes" jsonb,
	"snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "billing_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_event_id" text NOT NULL,
	"type" text NOT NULL,
	"tenant_id" uuid,
	"data" jsonb,
	"processed" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "billing_events_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sender_id" text NOT NULL,
	"sender_name" text NOT NULL,
	"content" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"read_by" text[] DEFAULT '{}',
	"edited" boolean DEFAULT false,
	"deleted" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" text NOT NULL,
	"name" text,
	"record_id" uuid,
	"participants" text[] NOT NULL,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"label" text NOT NULL,
	"type" text NOT NULL,
	"field_order" integer NOT NULL,
	"required" boolean DEFAULT false,
	"sensitive" boolean DEFAULT false,
	"filterable" boolean DEFAULT true,
	"searchable" boolean DEFAULT true,
	"show_in_table" boolean DEFAULT true,
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_by" text NOT NULL,
	CONSTRAINT "fields_tenant_order" UNIQUE("tenant_id","field_order")
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tenant_name" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"invited_by" text NOT NULL,
	"invited_by_name" text NOT NULL,
	"status" text DEFAULT 'pending',
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_by" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"read" boolean DEFAULT false,
	"actor_id" text,
	"actor_name" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"pipeline_stage" text,
	"assigned_to" uuid,
	"tags" text[] DEFAULT '{}',
	"version" integer DEFAULT 1,
	"deleted" boolean DEFAULT false,
	"deleted_at" timestamp with time zone,
	"deleted_by" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_by" text,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "saved_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"filters" jsonb DEFAULT '{"match":"all","filters":[]}'::jsonb NOT NULL,
	"sort" jsonb DEFAULT '[]'::jsonb,
	"columns" jsonb DEFAULT '[]'::jsonb,
	"shared" boolean DEFAULT false,
	"pinned" boolean DEFAULT false,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"content" text NOT NULL,
	"field_mappings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"primary_color" text DEFAULT '#7C3AED',
	"theme" text DEFAULT 'dark',
	"record_label" text DEFAULT 'Records',
	"record_label_singular" text DEFAULT 'Record',
	"document_label" text DEFAULT 'Documents',
	"plan" text DEFAULT 'free',
	"limits" jsonb DEFAULT '{"max_records":-1,"max_users":3,"max_fields":10,"max_storage_mb":500}'::jsonb,
	"usage" jsonb DEFAULT '{"record_count":0,"user_count":1,"field_count":0,"storage_used_mb":0}'::jsonb,
	"pipeline_config" jsonb DEFAULT '{"enabled":false,"stages":[]}'::jsonb,
	"whatsapp_config" jsonb DEFAULT '{"enabled":false}'::jsonb,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"subscription_status" text DEFAULT 'free',
	"trial_end_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"auth_uid" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text,
	"role" text DEFAULT 'employee' NOT NULL,
	"status" text DEFAULT 'active',
	"permissions" jsonb NOT NULL,
	"notification_prefs" jsonb DEFAULT '{"email_digest":false,"record_assigned":true,"chat_mentions":true}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"last_active" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_auth_uid_unique" UNIQUE("auth_uid"),
	CONSTRAINT "users_tenant_email" UNIQUE("tenant_id","email")
);
--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_room_id_chat_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."chat_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_record_id_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fields" ADD CONSTRAINT "fields_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "records" ADD CONSTRAINT "records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "records" ADD CONSTRAINT "records_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activity_tenant" ON "activity" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_activity_action" ON "activity" USING btree ("tenant_id","action","created_at");--> statement-breakpoint
CREATE INDEX "idx_messages_room" ON "chat_messages" USING btree ("room_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_chat_rooms_tenant" ON "chat_rooms" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_fields_tenant" ON "fields" USING btree ("tenant_id","field_order");--> statement-breakpoint
CREATE INDEX "idx_invites_email" ON "invites" USING btree ("email","tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_invites_tenant" ON "invites" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" USING btree ("user_id","read","created_at");--> statement-breakpoint
CREATE INDEX "idx_records_tenant_active" ON "records" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_records_pipeline" ON "records" USING btree ("tenant_id","pipeline_stage","created_at");--> statement-breakpoint
CREATE INDEX "idx_records_assigned" ON "records" USING btree ("tenant_id","assigned_to","created_at");--> statement-breakpoint
CREATE INDEX "idx_records_data" ON "records" USING btree ("data");--> statement-breakpoint
CREATE INDEX "idx_records_tags" ON "records" USING btree ("tags");--> statement-breakpoint
CREATE INDEX "idx_views_tenant" ON "saved_views" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_users_tenant" ON "users" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_users_auth_uid" ON "users" USING btree ("auth_uid");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");