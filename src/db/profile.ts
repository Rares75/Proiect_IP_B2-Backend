import {
	pgTable,
	serial,
	text,
	boolean,
	real,
	integer,
	varchar,
	jsonb,
	geometry,
	index,
	timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth-schema";
import { verificationStatusEnum } from "./enums";

export const profiles = pgTable("profiles", {
	id: serial("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => user.id, {
			onDelete: "cascade",
		}),
	bio: text("bio"),
	languages: jsonb("languages").$type<string[]>().default([]),
	hiddenIdentity: boolean("hidden_identity").notNull().default(false),
});

export const volunteers = pgTable("volunteers", {
	id: serial("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: "cascade" }),
	availability: boolean("availability").notNull().default(false),
	trustScore: real("trust_score").notNull().default(0),
	completedTasks: integer("completed_tasks").notNull().default(0),
});

export const volunteerProfiles = pgTable(
	"volunteer_profiles",
	{
		id: serial("id").primaryKey(),
		volunteerId: integer("volunteer_id")
			.notNull()
			.unique()
			.references(() => volunteers.id, { onDelete: "cascade" }),
		skills: jsonb("skills").$type<string[]>().default([]),
		maxDistanceKm: real("max_distance_km"),
		currentLocation: geometry("current_location", {
			type: "point",
			mode: "xy",
			srid: 4326,
		}),
	},
	(t) => [
		index("idx_volunteer_profiles_location").using("gist", t.currentLocation),
	],
);

export const volunteerKnownLocations = pgTable(
	"volunteer_known_locations",
	{
		id: serial("id").primaryKey(),
		volunteerId: integer("volunteer_id")
			.notNull()
			.references(() => volunteers.id, { onDelete: "cascade" }),
		city: varchar("city", { length: 100 }),
		addressText: text("address_text"),
		location: geometry("location", {
			type: "point",
			mode: "xy",
			srid: 4326,
		}).notNull(),
	},
	(t) => [
		index("idx_volunteer_known_locations_location").using("gist", t.location),
	],
);

export const userVerifications = pgTable("user_verifications", {
	id: serial("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: "cascade" }),
	status: verificationStatusEnum("status").notNull().default("PENDING"),
	submittedAt: timestamp("submitted_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	verifiedAt: timestamp("verified_at", { withTimezone: true }),
});

export const profilesRelations = relations(profiles, ({ one }) => ({
	user: one(user, {
		fields: [profiles.userId],
		references: [user.id],
	}),
}));

export const volunteersRelations = relations(volunteers, ({ one, many }) => ({
	user: one(user, {
		fields: [volunteers.userId],
		references: [user.id],
	}),
	volunteerProfile: one(volunteerProfiles, {
		fields: [volunteers.id],
		references: [volunteerProfiles.volunteerId],
	}),
	knownLocations: many(volunteerKnownLocations),
}));

export const volunteerProfilesRelations = relations(
	volunteerProfiles,
	({ one }) => ({
		volunteer: one(volunteers, {
			fields: [volunteerProfiles.volunteerId],
			references: [volunteers.id],
		}),
	}),
);

export const volunteerKnownLocationsRelations = relations(
	volunteerKnownLocations,
	({ one }) => ({
		volunteer: one(volunteers, {
			fields: [volunteerKnownLocations.volunteerId],
			references: [volunteers.id],
		}),
	}),
);

export const userVerificationsRelations = relations(
	userVerifications,
	({ one }) => ({
		user: one(user, {
			fields: [userVerifications.userId],
			references: [user.id],
		}),
	}),
);
