ALTER TABLE "account" ADD COLUMN "banned_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "banned_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "userName" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_userName_unique" UNIQUE("userName");