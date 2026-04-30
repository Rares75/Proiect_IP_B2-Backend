CREATE TABLE "user_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"bio" text,
	"languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hidden_identity" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "volunteer_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" "verification_status" DEFAULT 'PENDING' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "volunteer_verifications_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "request_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"help_request_id" integer NOT NULL,
	"city" varchar(100),
	"address_text" text,
	"location" geometry(point),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "request_locations_help_request_id_unique" UNIQUE("help_request_id")
);
--> statement-breakpoint
ALTER TABLE "user_verifications" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "user_verifications" CASCADE;--> statement-breakpoint
ALTER TABLE "profiles" RENAME TO "user_accesses";--> statement-breakpoint
ALTER TABLE "user_accesses" DROP CONSTRAINT "profiles_user_id_unique";--> statement-breakpoint
ALTER TABLE "user_accesses" DROP CONSTRAINT "profiles_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "help_requests" DROP CONSTRAINT "help_requests_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "idx_help_requests_location";--> statement-breakpoint
ALTER TABLE "volunteer_profiles" ALTER COLUMN "skills" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_accesses" ADD COLUMN "status" "account_status" DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_accesses" ADD COLUMN "banned_reason" text;--> statement-breakpoint
ALTER TABLE "user_accesses" ADD COLUMN "banned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_accesses" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_accesses" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "volunteer_known_locations" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "volunteer_profiles" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "volunteer_profiles" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "volunteers" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "volunteers" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "help_requests" ADD COLUMN "requested_by_user_id" text;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD COLUMN "offer_id" integer;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "related_request_id" integer;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "related_assignment_id" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "display_username" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "phone_number" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "phone_number_verified" boolean;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "user_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_verifications" ADD CONSTRAINT "volunteer_verifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_locations" ADD CONSTRAINT "request_locations_help_request_id_help_requests_id_fk" FOREIGN KEY ("help_request_id") REFERENCES "public"."help_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_request_locations_location" ON "request_locations" USING gist ("location");--> statement-breakpoint
ALTER TABLE "user_accesses" ADD CONSTRAINT "user_accesses_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_requests" ADD CONSTRAINT "help_requests_requested_by_user_id_user_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_offer_id_help_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."help_offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_request_id_help_requests_id_fk" FOREIGN KEY ("related_request_id") REFERENCES "public"."help_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_assignment_id_task_assignments_id_fk" FOREIGN KEY ("related_assignment_id") REFERENCES "public"."task_assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_accesses" DROP COLUMN "bio";--> statement-breakpoint
ALTER TABLE "user_accesses" DROP COLUMN "languages";--> statement-breakpoint
ALTER TABLE "user_accesses" DROP COLUMN "hidden_identity";--> statement-breakpoint
ALTER TABLE "help_requests" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "help_requests" DROP COLUMN "location_city";--> statement-breakpoint
ALTER TABLE "help_requests" DROP COLUMN "location_address_text";--> statement-breakpoint
ALTER TABLE "help_requests" DROP COLUMN "location";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "banned_at";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "banned_reason";--> statement-breakpoint
ALTER TABLE "user_accesses" ADD CONSTRAINT "user_accesses_user_id_unique" UNIQUE("user_id");--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_assignment_author_recipient_unique" UNIQUE("task_assignment_id","written_by_user_id","received_by_user_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_username_unique" UNIQUE("username");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_phone_number_unique" UNIQUE("phone_number");