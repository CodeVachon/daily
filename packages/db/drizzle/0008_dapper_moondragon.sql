CREATE TABLE "task_dependency" (
	"task_id" text NOT NULL,
	"blocked_by_task_id" text NOT NULL,
	"created_by" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_dependency_task_id_blocked_by_task_id_pk" PRIMARY KEY("task_id","blocked_by_task_id"),
	CONSTRAINT "task_dependency_not_self" CHECK ("task_dependency"."task_id" <> "task_dependency"."blocked_by_task_id")
);
--> statement-breakpoint
ALTER TABLE "task_dependency" ADD CONSTRAINT "task_dependency_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependency" ADD CONSTRAINT "task_dependency_blocked_by_task_id_task_id_fk" FOREIGN KEY ("blocked_by_task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_dependency_blocked_by_idx" ON "task_dependency" USING btree ("blocked_by_task_id");