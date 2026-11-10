CREATE TABLE "worker_heartbeat" (
	"name" text PRIMARY KEY NOT NULL,
	"beat_at" timestamp with time zone NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL
);
