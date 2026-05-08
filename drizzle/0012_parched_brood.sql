CREATE TYPE "public"."message_content_type" AS ENUM('TEXTCONTENT', 'AUDIOCONTENT');--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "content" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "type" "message_content_type" DEFAULT 'TEXTCONTENT' NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "audio_url" text;