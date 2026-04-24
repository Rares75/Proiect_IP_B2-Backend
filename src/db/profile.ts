import { relations } from "drizzle-orm";
import {
	boolean,
	geometry,
	index,
	integer,
	jsonb,
	pgTable,
	real,
	serial,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { accountStatusEnum, verificationStatusEnum } from "./enums";

export const userProfiles = pgTable("user_profiles", {
	id: serial("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => user.id, {
			onDelete: "cascade",
		}),
	bio: text("bio"),
	languages: jsonb("languages").$type<string[]>().notNull().default([]),
	hiddenIdentity: boolean("hidden_identity").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date()),
});

export const userAccesses = pgTable("user_accesses", {
	id: serial("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: "cascade" }),
	status: accountStatusEnum("status").notNull().default("ACTIVE"),
	bannedReason: text("banned_reason"),
	bannedAt: timestamp("banned_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date()),
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
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date()),
});

export const volunteerProfiles = pgTable(
	"volunteer_profiles",
	{
		id: serial("id").primaryKey(),
		volunteerId: integer("volunteer_id")
			.notNull()
			.unique()
			.references(() => volunteers.id, { onDelete: "cascade" }),
		skills: jsonb("skills").$type<string[]>().notNull().default([]),
		maxDistanceKm: real("max_distance_km"),
		currentLocation: geometry("current_location", {
			type: "point",
			mode: "xy",
			srid: 4326,
		}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
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
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("idx_volunteer_known_locations_location").using("gist", t.location),
	],
);

export const volunteerVerifications = pgTable("volunteer_verifications", {
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
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date()),
});

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
	user: one(user, {
		fields: [userProfiles.userId],
		references: [user.id],
	}),
}));

export const userAccessesRelations = relations(userAccesses, ({ one }) => ({
	user: one(user, {
		fields: [userAccesses.userId],
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

export const volunteerVerificationsRelations = relations(
	volunteerVerifications,
	({ one }) => ({
		user: one(user, {
			fields: [volunteerVerifications.userId],
			references: [user.id],
		}),
	}),
);
