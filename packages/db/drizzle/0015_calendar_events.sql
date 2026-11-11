CREATE TABLE "calendar_event" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"calendar_id" text NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"all_day" boolean DEFAULT false NOT NULL,
	"time_zone" text,
	"status" text NOT NULL,
	"event_type" text NOT NULL,
	"organizer" jsonb,
	"creator" jsonb,
	"attendees" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"my_response" text,
	"meet_url" text,
	"conference_name" text,
	"conference" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"html_link" text,
	"recurring_event_id" text,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visibility" text,
	"remote_updated_at" timestamp with time zone,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_sync_state" (
	"user_id" text NOT NULL,
	"calendar_id" text NOT NULL,
	"sync_token" text,
	"last_synced_at" timestamp with time zone,
	"full_synced_at" timestamp with time zone,
	"last_error" text
);
--> statement-breakpoint
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_sync_state" ADD CONSTRAINT "calendar_sync_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_event_ref_idx" ON "calendar_event" USING btree ("user_id","calendar_id","external_id");--> statement-breakpoint
CREATE INDEX "calendar_event_user_start_idx" ON "calendar_event" USING btree ("user_id","start_at");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_sync_state_ref_idx" ON "calendar_sync_state" USING btree ("user_id","calendar_id");