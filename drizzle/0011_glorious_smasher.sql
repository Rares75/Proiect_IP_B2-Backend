ALTER TYPE "public"."notification_type" ADD VALUE 'ACCOUNT_DISABLED';--> statement-breakpoint
CREATE TABLE "disable_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"reason" text NOT NULL,
	"status" "account_status" DEFAULT 'BLOCKED' NOT NULL,
	"notified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_assignments" ALTER COLUMN "requested_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "help_requests" ADD COLUMN "audio_url" text;--> statement-breakpoint
ALTER TABLE "disable_notifications" ADD CONSTRAINT "disable_notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_disable_notifications_user_id" ON "disable_notifications" USING btree ("user_id");