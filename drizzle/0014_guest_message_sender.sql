ALTER TABLE "messages" ALTER COLUMN "sender_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "guest_session_id" varchar(128);--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_or_guest_check" CHECK ((("sender_id" is not null and "guest_session_id" is null) or ("sender_id" is null and "guest_session_id" is not null)));--> statement-breakpoint
