CREATE TABLE "task_link" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"state" text,
	"state_category" text,
	"assignee" text,
	"remote_updated_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"sync_error" text,
	"created_by" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_link" ADD CONSTRAINT "task_link_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_link" ADD CONSTRAINT "task_link_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_link_task_ref_idx" ON "task_link" USING btree ("task_id","provider","key");--> statement-breakpoint
CREATE INDEX "task_link_user_provider_idx" ON "task_link" USING btree ("user_id","provider");