CREATE TABLE "message_template" (
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"body" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" jsonb NOT NULL,
	CONSTRAINT "message_template_user_id_key_pk" PRIMARY KEY("user_id","key")
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "slack_member_id" text;--> statement-breakpoint
ALTER TABLE "message_template" ADD CONSTRAINT "message_template_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;