import { pgTable, uuid, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { InferSelectModel } from "drizzle-orm";

export const UrgencyLevel = pgEnum("urgencyLevel", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const RequestStatus = pgEnum("requestStatus", [
  "OPEN",
  "MATCHED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
]);

export const helpRequest = pgTable("HelpRequest", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  urgency: UrgencyLevel("urgency").notNull().default("LOW"),
  status: RequestStatus("status").notNull().default("OPEN"),
  anonymousMode: boolean("anonymousMode").notNull().default(false),
  location: text("location").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type HelpRequestType = InferSelectModel<typeof helpRequest>;