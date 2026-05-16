ALTER TABLE "messages" ALTER COLUMN "sender_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "guest_session_id" varchar(128);--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "guest_session_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;