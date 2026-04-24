import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export type SeedDatabase = PostgresJsDatabase<any>;

export type SeedContext = {
	users: Array<{ id: string; name: string; email: string }>;
	accounts: Array<{ id: string; userId: string }>;
	sessions: Array<{ id: string; userId: string }>;
	verification: Array<{ id: string }>;
	profiles: Array<{ id: number; userId: string }>;
	userAccesses: Array<{ id: number; userId: string }>;
	volunteers: Array<{ id: number; userId: string }>;
	volunteerProfiles: Array<{ id: number; volunteerId: number }>;
	volunteerKnownLocations: Array<{ id: number; volunteerId: number }>;
	userVerifications: Array<{ id: number; userId: string }>;
	helpRequests: Array<{ id: number; requestedByUserId: string | null }>;
	requestLocations: Array<{ id: number; helpRequestId: number }>;
	requestDetails: Array<{ id: number; helpRequestId: number }>;
	helpOffers: Array<{
		id: number;
		volunteerId: number;
		helpRequestId: number;
	}>;
	taskAssignments: Array<{
		id: number;
		helpRequestId: number;
		requestedByUserId: string;
		handledByVolunteerId: number;
	}>;
	conversations: Array<{ id: number; taskAssignmentId: number }>;
	messages: Array<{ id: number; conversationId: number; senderId: string }>;
	ratings: Array<{
		id: number;
		taskAssignmentId: number;
		writtenByUserId: string;
		receivedByUserId: string;
	}>;
	interactionHistories: Array<{
		id: number;
		userId: string;
		taskAssignmentId: number;
	}>;
	notifications: Array<{ id: number; userId: string }>;
};

export type EntitySeed = {
	name: string;
	run: (db: SeedDatabase, context: SeedContext) => Promise<void>;
};

export const createSeedContext = (): SeedContext => ({
	users: [],
	accounts: [],
	sessions: [],
	verification: [],
	profiles: [],
	userAccesses: [],
	volunteers: [],
	volunteerProfiles: [],
	volunteerKnownLocations: [],
	userVerifications: [],
	helpRequests: [],
	requestLocations: [],
	requestDetails: [],
	helpOffers: [],
	taskAssignments: [],
	conversations: [],
	messages: [],
	ratings: [],
	interactionHistories: [],
	notifications: [],
});
