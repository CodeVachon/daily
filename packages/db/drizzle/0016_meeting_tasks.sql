CREATE TABLE "meeting_task" (
	"user_id" text NOT NULL,
	"calendar_id" text NOT NULL,
	"external_id" text NOT NULL,
	"task_id" text NOT NULL,
	"title" text NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"auto_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meeting_task" ADD CONSTRAINT "meeting_task_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_task" ADD CONSTRAINT "meeting_task_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_task_ref_idx" ON "meeting_task" USING btree ("user_id","calendar_id","external_id");--> statement-breakpoint
CREATE INDEX "meeting_task_task_idx" ON "meeting_task" USING btree ("task_id");