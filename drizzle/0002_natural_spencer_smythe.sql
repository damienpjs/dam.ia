CREATE TYPE "public"."message_status" AS ENUM('ok', 'error');--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "status" "message_status" DEFAULT 'ok' NOT NULL;