CREATE TABLE "task_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"user_id" text NOT NULL,
	"body" text NOT NULL,
	"author" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"deleted_by" jsonb
);
--> statement-breakpoint
CREATE TABLE "task_comment_revision" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_id" text NOT NULL,
	"body" text NOT NULL,
	"replaced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"replaced_by" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_comment" ADD CONSTRAINT "task_comment_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comment" ADD CONSTRAINT "task_comment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comment_revision" ADD CONSTRAINT "task_comment_revision_comment_id_task_comment_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."task_comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_comment_task_idx" ON "task_comment" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "task_comment_revision_comment_idx" ON "task_comment_revision" USING btree ("comment_id","replaced_at");