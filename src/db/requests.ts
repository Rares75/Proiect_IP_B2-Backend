import { relations } from "drizzle-orm";
import {
	boolean,
	geometry,
	index,
	integer,
	jsonb,
	pgTable,
	serial,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import {
	assignmentStatusEnum,
	helpRequestCategoryEnum,
	offerStatusEnum,
	requestStatusEnum,
	urgencyLevelEnum,
} from "./enums";
import { volunteers } from "./profile";

export const helpRequests = pgTable("help_requests", {
	id: serial("id").primaryKey(),
	requestedByUserId: text("requested_by_user_id").references(() => user.id, {
		onDelete: "set null",
	}),
	guestSessionId: varchar("guest_session_id", { length: 128 }),
	title: varchar("title", { length: 255 }).notNull(),
	description: text("description"),
	urgency: urgencyLevelEnum("urgency").notNull().default("MEDIUM"),
	skillsNeeded: jsonb("skills").$type<string[]>().notNull().default([]),
	status: requestStatusEnum("status").notNull().default("OPEN"),
	anonymousMode: boolean("anonymous_mode").notNull().default(false),
	category: helpRequestCategoryEnum("category")
		.notNull()
		.default("FACE_TO_FACE"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const requestLocations = pgTable(
	"request_locations",
	{
		id: serial("id").primaryKey(),
		helpRequestId: integer("help_request_id")
			.notNull()
			.unique()
			.references(() => helpRequests.id, { onDelete: "cascade" }),
		city: varchar("city", { length: 100 }),
		addressText: text("address_text"),
		location: geometry("location", { type: "point", mode: "xy", srid: 4326 }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [index("idx_request_locations_location").using("gist", t.location)],
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
	offerId: integer("offer_id").references(() => helpOffers.id, {
		onDelete: "set null",
	}),
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
	startedAt: timestamp("started_at", { withTimezone: true }),
	completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const helpRequestsRelations = relations(
	helpRequests,
	({ one, many }) => ({
		requestDetails: one(requestDetails, {
			fields: [helpRequests.id],
			references: [requestDetails.helpRequestId],
		}),
		requestLocation: one(requestLocations, {
			fields: [helpRequests.id],
			references: [requestLocations.helpRequestId],
		}),
		helpOffers: many(helpOffers),
		taskAssignment: one(taskAssignments, {
			fields: [helpRequests.id],
			references: [taskAssignments.helpRequestId],
		}),
	}),
);

export const requestLocationsRelations = relations(
	requestLocations,
	({ one }) => ({
		helpRequest: one(helpRequests, {
			fields: [requestLocations.helpRequestId],
			references: [helpRequests.id],
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
		offer: one(helpOffers, {
			fields: [taskAssignments.offerId],
			references: [helpOffers.id],
		}),
		requester: one(user, {
			fields: [taskAssignments.requestedByUserId],
			references: [user.id],
		}),
		volunteer: one(volunteers, {
			fields: [taskAssignments.handledByVolunteerId],
			references: [volunteers.id],
		}),
		ratings: many(ratings),
		interactionHistories: many(interactionHistories),
	}),
);

import { interactionHistories, ratings } from "./social";
