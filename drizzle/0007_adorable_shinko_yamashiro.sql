CREATE TYPE "public"."help_request_category" AS ENUM('MESSAGES_ONLY', 'FACE_TO_FACE');--> statement-breakpoint
ALTER TABLE "help_requests" ADD COLUMN "skills" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "help_requests" ADD COLUMN "category" "help_request_category" DEFAULT 'FACE_TO_FACE' NOT NULL;