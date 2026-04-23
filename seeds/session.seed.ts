import { session } from "../src/db/schema";
import type { EntitySeed } from "./types";
import { futureSeedDate, seedDate } from "./helpers";

export const sessionSeed: EntitySeed = {
	name: "session",
	run: async (db, context) => {
		context.sessions = await db
			.insert(session)
			.values(
				context.users.slice(0, 15).map((user, index) => ({
					id: `session-${String(index + 1).padStart(3, "0")}`,
					expiresAt: futureSeedDate(index + 1),
					token: `seed-session-token-${String(index + 1).padStart(3, "0")}`,
					createdAt: seedDate(index + 1),
					updatedAt: seedDate(index + 1, 12),
					ipAddress: `127.0.0.${index + 1}`,
					userAgent: "Seed Browser",
					userId: user.id,
				})),
			)
			.returning();
	},
};
