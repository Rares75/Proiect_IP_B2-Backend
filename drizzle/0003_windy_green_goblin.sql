ALTER TABLE "account" ADD COLUMN "status" "account_status" DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "average_rating";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "status";