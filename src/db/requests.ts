import {
	pgTable,
	serial,
	text,
	boolean,
	integer,
	varchar,
	timestamp,
	geometry,
	index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
	urgencyLevelEnum,
	requestStatusEnum,
	offerStatusEnum,
	assignmentStatusEnum,
} from "./enums";
import { volunteers } from "./profile";
import { user } from "./auth-schema";

export const helpRequests = pgTable(
	"help_requests",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		guestSessionId: varchar("guest_session_id", { length: 128 }),
		title: varchar("title", { length: 255 }).notNull(),
		description: text("description"),
		urgency: urgencyLevelEnum("urgency").notNull().default("MEDIUM"),
		status: requestStatusEnum("status").notNull().default("OPEN"),
		anonymousMode: boolean("anonymous_mode").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),

		locationCity: varchar("location_city", { length: 100 }),
		locationAddressText: text("location_address_text"),
		location: geometry("location", { type: "point", mode: "xy", srid: 4326 }),
	},
	(t) => [index("idx_help_requests_location").using("gist", t.location)],
);

export const requestDetails = pgTable("request_details", {
	id: serial("id").primaryKey(),
	helpRequestId: integer("help_request_id")
		.notNull()
		.unique()
		.references(() => helpRequests.id, { onDelete: "cascade" }),
	notes: text("notes"),
	languageNeeded: varchar("language_needed", { length: 50 }),
	safetyNotes: text("safety_notes"),
});

export const helpOffers = pgTable("help_offers", {
	id: serial("id").primaryKey(),
	volunteerId: integer("volunteer_id")
		.notNull()
		.references(() => volunteers.id, { onDelete: "cascade" }),
	helpRequestId: integer("help_request_id")
		.notNull()
		.references(() => helpRequests.id, { onDelete: "cascade" }),
	message: text("message"),
	status: offerStatusEnum("status").notNull().default("PENDING"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const taskAssignments = pgTable("task_assignments", {
	id: serial("id").primaryKey(),
	helpRequestId: integer("help_request_id")
		.notNull()
		.unique()
		.references(() => helpRequests.id, { onDelete: "cascade" }),
	requestedByUserId: text("requested_by_user_id")
		.notNull()
		.references(() => user.id),
	handledByVolunteerId: integer("handled_by_volunteer_id")
		.notNull()
		.references(() => volunteers.id),
	status: assignmentStatusEnum("status").notNull().default("ASSIGNED"),
	assignedAt: timestamp("assigned_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const helpRequestsRelations = relations(
	helpRequests,
	({ one, many }) => ({
		requestDetails: one(requestDetails, {
			fields: [helpRequests.id],
			references: [requestDetails.helpRequestId],
		}),
		helpOffers: many(helpOffers),
		taskAssignment: one(taskAssignments, {
			fields: [helpRequests.id],
			references: [taskAssignments.helpRequestId],
		}),
	}),
);

export const requestDetailsRelations = relations(requestDetails, ({ one }) => ({
	helpRequest: one(helpRequests, {
		fields: [requestDetails.helpRequestId],
		references: [helpRequests.id],
	}),
}));

export const helpOffersRelations = relations(helpOffers, ({ one }) => ({
	volunteer: one(volunteers, {
		fields: [helpOffers.volunteerId],
		references: [volunteers.id],
	}),
	helpRequest: one(helpRequests, {
		fields: [helpOffers.helpRequestId],
		references: [helpRequests.id],
	}),
}));

export const taskAssignmentsRelations = relations(
	taskAssignments,
	({ one, many }) => ({
		helpRequest: one(helpRequests, {
			fields: [taskAssignments.helpRequestId],
			references: [helpRequests.id],
		}),
		volunteer: one(volunteers, {
			fields: [taskAssignments.handledByVolunteerId],
			references: [volunteers.id],
		}),
		ratings: many(ratings),
		interactionHistories: many(interactionHistories),
	}),
);

import { ratings } from "./social";
import { interactionHistories } from "./social";
