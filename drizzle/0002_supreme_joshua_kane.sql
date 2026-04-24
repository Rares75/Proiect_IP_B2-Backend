CREATE TYPE "public"."requestStatus" AS ENUM('OPEN', 'MATCHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."urgencyLevel" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TABLE "HelpRequest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"urgency" "urgencyLevel" DEFAULT 'LOW' NOT NULL,
	"status" "requestStatus" DEFAULT 'OPEN' NOT NULL,
	"anonymousMode" boolean DEFAULT false NOT NULL,
	"location" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "profiles" CASCADE;--> statement-breakpoint
DROP TABLE "user_verifications" CASCADE;--> statement-breakpoint
DROP TABLE "volunteer_known_locations" CASCADE;--> statement-breakpoint
DROP TABLE "volunteer_profiles" CASCADE;--> statement-breakpoint
DROP TABLE "volunteers" CASCADE;--> statement-breakpoint
DROP TABLE "help_offers" CASCADE;--> statement-breakpoint
DROP TABLE "help_requests" CASCADE;--> statement-breakpoint
DROP TABLE "request_details" CASCADE;--> statement-breakpoint
DROP TABLE "task_assignments" CASCADE;--> statement-breakpoint
DROP TABLE "conversations" CASCADE;--> statement-breakpoint
DROP TABLE "interaction_histories" CASCADE;--> statement-breakpoint
DROP TABLE "messages" CASCADE;--> statement-breakpoint
DROP TABLE "notifications" CASCADE;--> statement-breakpoint
DROP TABLE "ratings" CASCADE;--> statement-breakpoint
DROP TABLE "account" CASCADE;--> statement-breakpoint
DROP TABLE "session" CASCADE;--> statement-breakpoint
DROP TABLE "user" CASCADE;--> statement-breakpoint
DROP TABLE "verification" CASCADE;--> statement-breakpoint
DROP TYPE "public"."account_status";--> statement-breakpoint
DROP TYPE "public"."assignment_status";--> statement-breakpoint
DROP TYPE "public"."conversation_status";--> statement-breakpoint
DROP TYPE "public"."notification_type";--> statement-breakpoint
DROP TYPE "public"."offer_status";--> statement-breakpoint
DROP TYPE "public"."request_status";--> statement-breakpoint
DROP TYPE "public"."urgency_level";--> statement-breakpoint
DROP TYPE "public"."verification_status";