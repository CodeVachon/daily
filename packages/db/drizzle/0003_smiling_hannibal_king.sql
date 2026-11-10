CREATE TYPE "public"."task_status_category" AS ENUM('open', 'active', 'done', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('none', 'urgent', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TABLE "label" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" jsonb
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" jsonb
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status_key" text NOT NULL,
	"priority" "task_priority" DEFAULT 'none' NOT NULL,
	"due_date" date,
	"due_at" timestamp with time zone,
	"due_timezone" text,
	"project_id" text,
	"parent_task_id" text,
	"board_position" text NOT NULL,
	"completed_at" timestamp with time zone,
	"created_by" jsonb NOT NULL,
	"updated_by" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" jsonb,
	CONSTRAINT "task_due_one_kind" CHECK ("task"."due_date" is null or "task"."due_at" is null),
	CONSTRAINT "task_due_at_has_zone" CHECK (("task"."due_at" is null) = ("task"."due_timezone" is null)),
	CONSTRAINT "task_not_own_parent" CHECK ("task"."parent_task_id" is null or "task"."parent_task_id" <> "task"."id")
);
--> statement-breakpoint
CREATE TABLE "task_label" (
	"task_id" text NOT NULL,
	"label_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_label_task_id_label_id_pk" PRIMARY KEY("task_id","label_id")
);
--> statement-breakpoint
CREATE TABLE "task_status" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" "task_status_category" NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "label" ADD CONSTRAINT "label_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_status_key_task_status_key_fk" FOREIGN KEY ("status_key") REFERENCES "public"."task_status"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_parent_task_id_task_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "public"."task"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_label" ADD CONSTRAINT "task_label_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_label" ADD CONSTRAINT "task_label_label_id_label_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."label"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "label_user_name_uidx" ON "label" USING btree ("user_id",lower("name")) WHERE "label"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "project_user_id_index" ON "project" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "task_user_number_uidx" ON "task" USING btree ("user_id","number");--> statement-breakpoint
CREATE INDEX "task_board_idx" ON "task" USING btree ("user_id","status_key","board_position");--> statement-breakpoint
CREATE INDEX "task_due_date_idx" ON "task" USING btree ("user_id","due_date");--> statement-breakpoint
CREATE INDEX "task_due_at_idx" ON "task" USING btree ("user_id","due_at");--> statement-breakpoint
CREATE INDEX "task_project_idx" ON "task" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "task_parent_idx" ON "task" USING btree ("parent_task_id");--> statement-breakpoint
CREATE INDEX "task_label_label_id_index" ON "task_label" USING btree ("label_id");--> statement-breakpoint
-- Seed the fixed v1 board columns (#13). More can be added later as data.
INSERT INTO "task_status" ("key", "name", "category", "position") VALUES
  ('backlog', 'Backlog', 'open', 10),
  ('todo', 'Todo', 'open', 20),
  ('in_progress', 'In Progress', 'active', 30),
  ('blocked', 'Blocked', 'active', 40),
  ('done', 'Done', 'done', 50),
  ('cancelled', 'Cancelled', 'cancelled', 60);
