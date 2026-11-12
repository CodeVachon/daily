CREATE TABLE "standup_post" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"posted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"channel" text,
	"body" text NOT NULL,
	"posted_by" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "standup_post" ADD CONSTRAINT "standup_post_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "standup_post_user_idx" ON "standup_post" USING btree ("user_id","posted_at");